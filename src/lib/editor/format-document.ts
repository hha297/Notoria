import type { JSONContent } from "@tiptap/react";
import { isPersistedImageSrc } from "@/lib/editor/images";

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const BULLET_MARKER_RE = /^([-*•●◦.]|\u2022|\u00B7)\s+(.*)$/u;
/** Parenthesized ordered markers: 1) Item */
const ORDERED_PAREN_RE = /^(\d+)\)\s+(.+)$/u;

/**
 * Parse outline numbering used in theory/notes.
 * Supports trailing section dots common in FI/EU style: `2.1. Title`
 * - `1. Title` → depth 1
 * - `2.1 Title` / `2.1. Title` → depth 2
 * - `2.1.1 Title` / `2.1.1. Title` → depth 3
 */
export function parseSectionHeading(text: string): {
  depth: number;
  number: string;
  title: string;
} | null {
  const trimmed = text.trim();

  // "1. Title", "2.1. Title", "2.1.1. Title"
  const withSectionDot = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/u);
  if (withSectionDot?.[1] && withSectionDot[2]) {
    return {
      number: withSectionDot[1],
      depth: withSectionDot[1].split(".").filter(Boolean).length,
      title: withSectionDot[2],
    };
  }

  // "1.1 Title", "10.2.3 Title" (no trailing dot after the last segment)
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

/**
 * Hierarchical section depth from numbering.
 * `1.` → 1, `2.1` / `2.1.` → 2, `1.3.10` → 3
 */
export function hierarchicalHeadingDepth(text: string): number | null {
  return parseSectionHeading(text)?.depth ?? null;
}

function headingLevelFromDepth(depth: number): number {
  return Math.min(Math.max(depth, 1), 6);
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
  if (node.type === "codeBlock") {
    return tipTapNodePlainText(node).trim().length === 0;
  }
  if (node.type === "heading") {
    return tipTapNodePlainText(node).trim().length === 0;
  }
  if (
    node.type === "bulletList" ||
    node.type === "orderedList" ||
    node.type === "taskList"
  ) {
    return (node.content ?? []).length === 0;
  }
  if (node.type === "table" || node.type === "blockquote") {
    return tipTapNodePlainText(node).trim().length === 0;
  }
  if (node.type === "paragraph") {
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

function tidyBlockNode(node: JSONContent): JSONContent {
  const inCodeBlock = node.type === "codeBlock";
  const next: JSONContent = { ...node };

  if (next.content) {
    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "codeBlock"
    ) {
      next.content = tidyInlineNodes(next.content, inCodeBlock);
      if (!inCodeBlock && next.content?.length) {
        const first = next.content[0];
        const last = next.content[next.content.length - 1];
        if (first?.type === "text" && typeof first.text === "string") {
          first.text = first.text.replace(/^[ \t]+/, "");
        }
        if (last?.type === "text" && typeof last.text === "string") {
          last.text = last.text.replace(/[ \t]+$/, "");
        }
        next.content = next.content.filter(
          (child) => child.type !== "text" || (child.text?.length ?? 0) > 0,
        );
      }
    } else if (
      node.type === "bulletList" ||
      node.type === "orderedList" ||
      node.type === "taskList"
    ) {
      next.content = tidyListItems(next.content);
    } else if (
      node.type === "blockquote" ||
      node.type === "table" ||
      node.type === "tableRow"
    ) {
      next.content = next.content.map(tidyBlockNode);
    } else if (
      node.type === "listItem" ||
      node.type === "taskItem" ||
      node.type === "tableCell" ||
      node.type === "tableHeader"
    ) {
      next.content = next.content.map(tidyBlockNode);
    } else {
      next.content = tidyInlineNodes(next.content, false);
    }
  }

  return next;
}

function collapseEmptyParagraphs(nodes: JSONContent[]): JSONContent[] {
  const collapsed: JSONContent[] = [];
  let prevEmpty = false;

  for (const node of nodes) {
    const empty = isVisuallyEmptyBlock(node);
    if (empty) {
      if (node.type === "heading" || node.type === "bulletList" || node.type === "orderedList") {
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

function paragraphToHeading(paragraph: JSONContent, level: number): JSONContent {
  return {
    type: "heading",
    attrs: { ...(paragraph.attrs ?? {}), level },
    content: paragraph.content,
  };
}

function looksLikeOrderedListRun(nodes: JSONContent[], start: number): boolean {
  const items: { n: number; title: string }[] = [];
  for (let i = start; i < nodes.length; i += 1) {
    const node = nodes[i]!;
    if (node.type !== "paragraph" && node.type !== "heading") break;
    const text = tipTapNodePlainText(node).trim();
    if (parseSectionHeading(text)) return false;
    const match = text.match(ORDERED_PAREN_RE);
    if (!match) break;
    items.push({ n: Number(match[1]), title: match[2]!.trim() });
  }

  return items.length >= 2;
}

function applySectionHeadingLevel(node: JSONContent, level: number): JSONContent {
  if (node.type === "heading") {
    return {
      ...node,
      attrs: { ...(node.attrs ?? {}), level },
    };
  }
  return paragraphToHeading(node, level);
}

function normalizeHierarchicalHeadings(nodes: JSONContent[]): JSONContent[] {
  return nodes.map((node) => {
    if (node.type !== "paragraph" && node.type !== "heading") {
      return node;
    }

    const text = tipTapNodePlainText(node).trim();
    if (!text) return node;

    const section = parseSectionHeading(text);
    if (!section) return node;

    return applySectionHeadingLevel(node, headingLevelFromDepth(section.depth));
  });
}

function promoteSingleNumberHeadings(nodes: JSONContent[]): JSONContent[] {
  // Covered by normalizeHierarchicalHeadings for both paragraphs and headings.
  return nodes;
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
    const bullet = text.match(BULLET_MARKER_RE);

    if (bullet) {
      const items: JSONContent[] = [];
      while (i < nodes.length) {
        const current = nodes[i]!;
        if (current.type !== "paragraph") break;
        const currentText = tipTapNodePlainText(current).trim();
        const match = currentText.match(BULLET_MARKER_RE);
        if (!match) break;
        const markerLength = currentText.length - (match[2]?.length ?? 0);
        items.push({
          type: "listItem",
          content: [stripParagraphPrefix(current, markerLength)],
        });
        i += 1;
      }
      result.push({ type: "bulletList", content: items });
      continue;
    }

    if (ORDERED_PAREN_RE.test(text) && looksLikeOrderedListRun(nodes, i)) {
      const items: JSONContent[] = [];
      while (i < nodes.length) {
        const current = nodes[i]!;
        if (current.type !== "paragraph") break;
        const currentText = tipTapNodePlainText(current).trim();
        const match = currentText.match(ORDERED_PAREN_RE);
        if (!match) break;
        const markerLength = currentText.length - (match[2]?.length ?? 0);
        items.push({
          type: "listItem",
          content: [stripParagraphPrefix(current, markerLength)],
        });
        i += 1;
      }
      result.push({ type: "orderedList", content: items });
      continue;
    }

    result.push(node);
    i += 1;
  }

  return result;
}

function isClearUnmarkedListItem(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 48) return false;
  if (/[.!?…]$/u.test(trimmed)) return false;
  if (parseSectionHeading(trimmed)) return false;
  if (BULLET_MARKER_RE.test(trimmed)) return false;
  if (trimmed.includes("\n")) return false;
  // Prefer noun-like / short label lines, not full clauses.
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 1 && words.length <= 6;
}

function promoteClearUnmarkedLists(nodes: JSONContent[]): JSONContent[] {
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
    if (!isClearUnmarkedListItem(text)) {
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
      if (!isClearUnmarkedListItem(currentText)) break;
      items.push({
        type: "listItem",
        content: [{ type: "paragraph", content: current.content }],
      });
      j += 1;
    }

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
 * Cleans whitespace, normalizes lists/headings, never rewrites wording.
 */
export function formatTiptapDocument(doc: JSONContent | null | undefined): JSONContent {
  if (!doc || !isTipTapDoc(doc)) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  let content = (doc.content ?? []).map(tidyBlockNode);
  content = collapseEmptyParagraphs(content);
  content = normalizeHierarchicalHeadings(content);
  content = promoteSingleNumberHeadings(content);
  content = promoteMarkedListParagraphs(content);
  content = promoteClearUnmarkedLists(content);
  content = collapseEmptyParagraphs(content);

  if (content.length === 0) {
    return structuredClone(EMPTY_TIPTAP_DOC);
  }

  return { type: "doc", content };
}
