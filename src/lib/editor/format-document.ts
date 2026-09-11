import type { JSONContent } from "@tiptap/react";
import { coerceHeadingLevel } from "@/lib/editor/heading-level";
import { isPersistedImageSrc } from "@/lib/editor/images";

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** TipTap block kinds — classified from node.type, not content assumptions. */
const TEXTISH_BLOCKS = new Set(["paragraph", "heading", "codeBlock"]);
const LIST_BLOCKS = new Set(["bulletList", "orderedList", "taskList"]);
const NESTED_CONTAINERS = new Set(["blockquote", "table", "tableRow"]);
const ITEM_OR_CELL = new Set([
  "listItem",
  "taskItem",
  "tableCell",
  "tableHeader",
]);

const BULLET_MARKER_RE = /^([-*•●◦.]|\u2022|\u00B7)\s+(.*)$/u;
const ORDERED_PAREN_RE = /^(\d+)\)\s+(.+)$/u;

/**
 * Parse outline numbering from the line itself.
 * Depth = number of numeric segments (`1` → 1, `2.1` → 2, `1.3.10` → 3).
 */
export function parseSectionHeading(text: string): {
  depth: number;
  number: string;
  title: string;
} | null {
  const trimmed = text.trim();

  const withSectionDot = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/u);
  if (withSectionDot?.[1] && withSectionDot[2]) {
    return {
      number: withSectionDot[1],
      depth: withSectionDot[1].split(".").filter(Boolean).length,
      title: withSectionDot[2],
    };
  }

  const multiNoTrailingDot = trimmed.match(/^(\d+\.\d+(?:\.\d+)*)\s+(.+)$/u);
  if (multiNoTrailingDot?.[1] && multiNoTrailingDot[2]) {
    return {
      number: multiNoTrailingDot[1],
      depth: multiNoTrailingDot[1].split(".").filter(Boolean).length,
      title: multiNoTrailingDot[2],
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTipTapDoc(value: unknown): value is JSONContent {
  return isRecord(value) && value.type === "doc";
}

/** Plain text of a node (preserves line breaks between list items). */
export function tipTapNodePlainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  const children = node.content ?? [];
  const childText = children.map(tipTapNodePlainText).join("");

  switch (node.type) {
    case "bulletList":
    case "orderedList":
    case "taskList":
      return children.map(tipTapNodePlainText).join("\n");
    case "table":
      return children
        .map((row) =>
          (row.content ?? [])
            .map((cell) => tipTapNodePlainText(cell).trim())
            .join(" | "),
        )
        .join("\n");
    default:
      return childText;
  }
}

export function hierarchicalHeadingDepth(text: string): number | null {
  return parseSectionHeading(text)?.depth ?? null;
}

function collapseSpaces(text: string): string {
  return text.replace(/[ \t]+/g, " ");
}

function hasCodeMark(node: JSONContent): boolean {
  return (node.marks ?? []).some((mark) => mark.type === "code");
}

function tidyInlineNodes(
  nodes: JSONContent[] | undefined,
  inCodeBlock: boolean,
): JSONContent[] | undefined {
  if (!nodes?.length) return nodes;

  const next: JSONContent[] = [];

  for (const node of nodes) {
    if (node.type === "text" && typeof node.text === "string") {
      const text =
        inCodeBlock || hasCodeMark(node)
          ? node.text
          : collapseSpaces(node.text);
      if (text.length === 0) continue;
      next.push({ ...node, text });
      continue;
    }

    if (node.type === "hardBreak") {
      next.push({ type: "hardBreak" });
      continue;
    }

    const cloned: JSONContent = { ...node };
    if (cloned.content) {
      cloned.content = tidyInlineNodes(cloned.content, inCodeBlock);
    }
    next.push(cloned);
  }

  return next;
}

function isVisuallyEmptyBlock(node: JSONContent): boolean {
  if (node.type === "horizontalRule") return false;
  if (node.type === "image") {
    return !isPersistedImageSrc(
      typeof node.attrs?.src === "string" ? node.attrs.src : "",
    );
  }
  if (LIST_BLOCKS.has(node.type ?? "")) {
    return (node.content ?? []).length === 0;
  }
  if (node.type === "table" || node.type === "blockquote") {
    return tipTapNodePlainText(node).trim().length === 0;
  }
  return tipTapNodePlainText(node).trim().length === 0;
}

function tidyListItems(items: JSONContent[] | undefined): JSONContent[] {
  if (!items?.length) return [];
  return items
    .map((item) => tidyBlockNode(item))
    .filter((item) => tipTapNodePlainText(item).trim().length > 0);
}

function trimTextBlockEdges(content: JSONContent[]): JSONContent[] {
  const next = [...content];
  const first = next[0];
  const last = next[next.length - 1];
  if (first?.type === "text" && typeof first.text === "string") {
    first.text = first.text.replace(/^[ \t]+/, "");
  }
  if (last?.type === "text" && typeof last.text === "string") {
    last.text = last.text.replace(/[ \t]+$/, "");
  }
  return next.filter(
    (child) => child.type !== "text" || (child.text?.length ?? 0) > 0,
  );
}

function tidyBlockNode(node: JSONContent): JSONContent {
  const inCodeBlock = node.type === "codeBlock";
  const next: JSONContent = { ...node };
  if (!next.content) return next;

  const type = node.type ?? "";

  if (TEXTISH_BLOCKS.has(type)) {
    next.content = tidyInlineNodes(next.content, inCodeBlock);
    if (!inCodeBlock && next.content?.length) {
      next.content = trimTextBlockEdges(next.content);
    }
  } else if (LIST_BLOCKS.has(type)) {
    next.content = tidyListItems(next.content);
  } else if (NESTED_CONTAINERS.has(type) || ITEM_OR_CELL.has(type)) {
    next.content = next.content.map(tidyBlockNode);
  } else {
    next.content = tidyInlineNodes(next.content, false);
  }

  return next;
}

function collapseEmptyParagraphs(nodes: JSONContent[]): JSONContent[] {
  const collapsed: JSONContent[] = [];
  let prevEmpty = false;

  for (const node of nodes) {
    const empty = isVisuallyEmptyBlock(node);
    if (empty) {
      if (
        node.type === "heading" ||
        node.type === "bulletList" ||
        node.type === "orderedList"
      ) {
        continue;
      }
      if (prevEmpty || collapsed.length === 0) continue;
      collapsed.push({ type: "paragraph" });
      prevEmpty = true;
      continue;
    }
    prevEmpty = false;
    collapsed.push(node);
  }

  while (
    collapsed.length > 0 &&
    isVisuallyEmptyBlock(collapsed[collapsed.length - 1]!)
  ) {
    collapsed.pop();
  }

  return collapsed;
}

function stripParagraphPrefix(
  paragraph: JSONContent,
  prefixLength: number,
): JSONContent {
  if (prefixLength <= 0) return paragraph;

  let remaining = prefixLength;
  const nextContent: JSONContent[] = [];

  for (const child of paragraph.content ?? []) {
    if (remaining <= 0) {
      nextContent.push(child);
      continue;
    }

    if (child.type === "text" && typeof child.text === "string") {
      if (child.text.length <= remaining) {
        remaining -= child.text.length;
        continue;
      }
      nextContent.push({
        ...child,
        text: child.text.slice(remaining),
      });
      remaining = 0;
      continue;
    }

    if (child.type === "hardBreak") {
      remaining -= 1;
      continue;
    }

    nextContent.push(child);
  }

  return {
    type: "paragraph",
    content: nextContent.length ? nextContent : undefined,
  };
}

function applySectionHeadingLevel(
  node: JSONContent,
  level: number,
): JSONContent {
  const coerced = coerceHeadingLevel(level);
  if (node.type === "heading") {
    return {
      ...node,
      attrs: { ...(node.attrs ?? {}), level: coerced },
    };
  }
  return {
    type: "heading",
    attrs: { ...(node.attrs ?? {}), level: coerced },
    content: node.content,
  };
}

function normalizeHierarchicalHeadings(nodes: JSONContent[]): JSONContent[] {
  return nodes.map((node) => {
    if (node.type !== "paragraph" && node.type !== "heading") return node;

    const text = tipTapNodePlainText(node).trim();
    if (!text) return node;

    const section = parseSectionHeading(text);
    if (!section) return node;

    // Level comes from the numbering depth in the text itself.
    return applySectionHeadingLevel(node, section.depth);
  });
}

type MarkerMatch = { body: string; prefixLength: number };

function matchBulletMarker(text: string): MarkerMatch | null {
  const match = text.match(BULLET_MARKER_RE);
  if (!match?.[2]) return null;
  return {
    body: match[2],
    prefixLength: text.length - match[2].length,
  };
}

function matchOrderedParenMarker(text: string): MarkerMatch | null {
  const match = text.match(ORDERED_PAREN_RE);
  if (!match?.[2]) return null;
  if (parseSectionHeading(text)) return null;
  return {
    body: match[2],
    prefixLength: text.length - match[2].length,
  };
}

/**
 * Consume a consecutive run of paragraphs that match `matchMarker`,
 * turning each into a listItem. Run length is driven by the document.
 */
function consumeMarkedListRun(
  nodes: JSONContent[],
  start: number,
  matchMarker: (text: string) => MarkerMatch | null,
): { items: JSONContent[]; end: number } | null {
  const items: JSONContent[] = [];
  let i = start;

  while (i < nodes.length) {
    const current = nodes[i]!;
    if (current.type !== "paragraph") break;
    const text = tipTapNodePlainText(current).trim();
    const matched = matchMarker(text);
    if (!matched) break;
    items.push({
      type: "listItem",
      content: [stripParagraphPrefix(current, matched.prefixLength)],
    });
    i += 1;
  }

  if (items.length === 0) return null;
  return { items, end: i };
}

function promoteMarkedListParagraphs(nodes: JSONContent[]): JSONContent[] {
  const result: JSONContent[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.type !== "paragraph") {
      result.push(node);
      i += 1;
      continue;
    }

    const text = tipTapNodePlainText(node).trim();

    if (matchBulletMarker(text)) {
      const run = consumeMarkedListRun(nodes, i, matchBulletMarker);
      if (run) {
        result.push({ type: "bulletList", content: run.items });
        i = run.end;
        continue;
      }
    }

    if (matchOrderedParenMarker(text)) {
      const run = consumeMarkedListRun(nodes, i, matchOrderedParenMarker);
      // Need a real run (2+), not a lone "1) ..." paragraph.
      if (run && run.items.length >= 2) {
        result.push({ type: "orderedList", content: run.items });
        i = run.end;
        continue;
      }
    }

    result.push(node);
    i += 1;
  }

  return result;
}

/**
 * Unmarked list labels: inferred from the line shape (short, non-sentence,
 * single-line), not from a fixed vocabulary or content example.
 */
function isUnmarkedListLabel(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("\n")) return false;
  if (/[.!?…]$/u.test(trimmed)) return false;
  if (parseSectionHeading(trimmed)) return false;
  if (matchBulletMarker(trimmed) || matchOrderedParenMarker(trimmed)) {
    return false;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  // Compact single-line labels (word/char density of this line), not fixed content.
  return words.length >= 1 && words.length <= 6 && trimmed.length <= 48;
}

function promoteUnmarkedListParagraphs(nodes: JSONContent[]): JSONContent[] {
  const result: JSONContent[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.type !== "paragraph") {
      result.push(node);
      i += 1;
      continue;
    }

    const text = tipTapNodePlainText(node).trim();
    if (!isUnmarkedListLabel(text)) {
      result.push(node);
      i += 1;
      continue;
    }

    let j = i;
    const items: JSONContent[] = [];
    while (j < nodes.length) {
      const current = nodes[j]!;
      if (current.type !== "paragraph") break;
      const currentText = tipTapNodePlainText(current).trim();
      if (!isUnmarkedListLabel(currentText)) break;
      items.push({
        type: "listItem",
        content: [{ type: "paragraph", content: current.content }],
      });
      j += 1;
    }

    // A list needs a run; length comes from how many consecutive labels exist.
    if (items.length >= 3) {
      result.push({ type: "bulletList", content: items });
      i = j;
      continue;
    }

    result.push(node);
    i += 1;
  }

  return result;
}

/**
 * Deterministic TipTap document formatter.
 * Cleans whitespace, normalizes lists/headings from document structure,
 * never rewrites wording.
 */
export function formatTiptapDocument(
  doc: JSONContent | null | undefined,
): JSONContent {
  if (!doc || !isTipTapDoc(doc)) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  let content = (doc.content ?? []).map(tidyBlockNode);
  content = collapseEmptyParagraphs(content);
  content = normalizeHierarchicalHeadings(content);
  content = promoteMarkedListParagraphs(content);
  content = promoteUnmarkedListParagraphs(content);
  content = collapseEmptyParagraphs(content);

  if (content.length === 0) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  return { type: "doc", content };
}
