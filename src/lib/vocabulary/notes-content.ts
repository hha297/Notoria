import type { JSONContent } from "@tiptap/react";
import { formatVocabularyNotes } from "@/lib/vocabulary/format-notes";
import {
  isPersistedImageSrc,
  stripTransientImages,
} from "@/lib/editor/images";

export const EMPTY_NOTES_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isTipTapDoc(value: unknown): value is JSONContent {
  return isRecord(value) && value.type === "doc";
}

/** Legacy plain text / markdown-ish → TipTap doc (lists, headings, code). */
export function plainTextToNotesDoc(text: string): JSONContent {
  const formatted = formatVocabularyNotes(text);
  if (!formatted) {
    return structuredClone(EMPTY_NOTES_DOC);
  }
  return formatableTextToDoc(formatted);
}

function paragraphFromText(text: string): JSONContent {
  if (!text) return { type: "paragraph" };
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

function listItemFromText(text: string): JSONContent {
  return {
    type: "listItem",
    content: [paragraphFromText(text)],
  };
}

/** Parse formatter output into TipTap nodes (deterministic). */
export function formatableTextToDoc(text: string): JSONContent {
  const lines = text.split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeLines.push(lines[i]!);
        i += 1;
      }
      if (i < lines.length) i += 1;
      content.push({
        type: "codeBlock",
        attrs: { language: lang || null },
        content: codeLines.length
          ? [{ type: "text", text: codeLines.join("\n") }]
          : undefined,
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1]!.length },
        content: heading[2]
          ? [{ type: "text", text: heading[2] }]
          : undefined,
      });
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      content.push({ type: "horizontalRule" });
      i += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: JSONContent[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i]!)) {
        items.push(listItemFromText(lines[i]!.replace(/^[-*•]\s+/, "")));
        i += 1;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: JSONContent[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i]!)) {
        items.push(listItemFromText(lines[i]!.replace(/^\d+[.)]\s+/, "")));
        i += 1;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    if (line.startsWith("> ")) {
      content.push({
        type: "blockquote",
        content: [paragraphFromText(line.slice(2))],
      });
      i += 1;
      continue;
    }

    content.push(paragraphFromText(line));
    i += 1;
  }

  if (content.length === 0) {
    return structuredClone(EMPTY_NOTES_DOC);
  }

  return { type: "doc", content };
}

/**
 * Parse stored notes (TipTap JSON string or legacy plain text).
 */
export function parseVocabularyNotes(raw: string | null | undefined): JSONContent {
  if (!raw?.trim()) {
    return structuredClone(EMPTY_NOTES_DOC);
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isTipTapDoc(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through to plain text.
    }
  }

  return plainTextToNotesDoc(raw);
}

export function serializeVocabularyNotes(doc: JSONContent): string {
  const cleaned = stripTransientImages(doc);
  if (isNotesDocEmpty(cleaned)) {
    return "";
  }
  return JSON.stringify(cleaned);
}

function nodePlainText(node: JSONContent): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  const children = node.content ?? [];
  const childText = children.map(nodePlainText).join("");

  switch (node.type) {
    case "paragraph":
    case "heading":
    case "blockquote":
      return childText;
    case "codeBlock":
      return childText;
    case "listItem":
    case "taskItem":
      return childText;
    case "bulletList":
    case "orderedList":
    case "taskList":
      return children.map(nodePlainText).join("\n");
    case "horizontalRule":
      return "";
    default:
      return childText;
  }
}

/** Flatten notes for CSV / PDF / flashcards. */
export function vocabularyNotesToPlainText(
  raw: string | null | undefined,
): string {
  if (!raw?.trim()) return "";

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return formatVocabularyNotes(raw);
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isTipTapDoc(parsed)) {
      return formatVocabularyNotes(raw);
    }

    const blocks: string[] = [];
    for (const node of parsed.content ?? []) {
      if (node.type === "bulletList") {
        for (const item of node.content ?? []) {
          const line = nodePlainText(item).trim();
          if (line) blocks.push(`- ${line}`);
        }
        continue;
      }
      if (node.type === "orderedList") {
        (node.content ?? []).forEach((item, index) => {
          const line = nodePlainText(item).trim();
          if (line) blocks.push(`${index + 1}. ${line}`);
        });
        continue;
      }
      if (node.type === "codeBlock") {
        const lang =
          typeof node.attrs?.language === "string" ? node.attrs.language : "";
        blocks.push(`\`\`\`${lang}\n${nodePlainText(node)}\n\`\`\``);
        continue;
      }
      if (node.type === "heading") {
        const level =
          typeof node.attrs?.level === "number" ? node.attrs.level : 1;
        blocks.push(`${"#".repeat(level)} ${nodePlainText(node).trim()}`);
        continue;
      }
      if (node.type === "horizontalRule") {
        blocks.push("---");
        continue;
      }
      if (node.type === "paragraph" && !node.content?.length) {
        blocks.push("");
        continue;
      }
      blocks.push(nodePlainText(node));
    }

    return formatVocabularyNotes(blocks.join("\n"));
  } catch {
    return formatVocabularyNotes(raw);
  }
}

export function isNotesDocEmpty(doc: JSONContent | null | undefined): boolean {
  if (!doc?.content?.length) return true;

  return !doc.content.some((node) => {
    if (node.type === "horizontalRule") return true;
    if (node.type === "image") {
      return isPersistedImageSrc(
        typeof node.attrs?.src === "string" ? node.attrs.src : "",
      );
    }
    if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
      return (node.content?.length ?? 0) > 0;
    }
    if (node.type === "codeBlock") {
      return nodePlainText(node).trim().length > 0;
    }
    return nodePlainText(node).trim().length > 0;
  });
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
  if (
    node.type === "bulletList" ||
    node.type === "orderedList" ||
    node.type === "taskList" ||
    node.type === "codeBlock" ||
    node.type === "blockquote" ||
    node.type === "heading"
  ) {
    return false;
  }
  if (node.type === "paragraph") {
    return nodePlainText(node).trim().length === 0;
  }
  return nodePlainText(node).trim().length === 0;
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
      node.type === "taskList" ||
      node.type === "blockquote"
    ) {
      next.content = next.content.map(tidyBlockNode);
    } else if (node.type === "listItem" || node.type === "taskItem") {
      next.content = next.content.map(tidyBlockNode);
    } else {
      next.content = tidyInlineNodes(next.content, false);
    }
  }

  return next;
}

/**
 * TipTap-aware notes tidy: collapse spaces, trim edges, drop extra empty
 * paragraphs. Preserves marks and list structure. Idempotent.
 */
export function formatTipTapNotesDoc(doc: JSONContent): JSONContent {
  const content = (doc.content ?? []).map(tidyBlockNode);
  const collapsed: JSONContent[] = [];
  let prevEmpty = false;

  for (const node of content) {
    const empty = isVisuallyEmptyBlock(node);
    if (empty) {
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

  if (collapsed.length === 0) {
    return structuredClone(EMPTY_NOTES_DOC);
  }

  return { type: "doc", content: collapsed };
}

function docLooksPlainParagraphsOnly(doc: JSONContent): boolean {
  return (doc.content ?? []).every((node) => {
    if (node.type === "paragraph") {
      const marks = (node.content ?? []).some(
        (child) => (child.marks?.length ?? 0) > 0,
      );
      return !marks;
    }
    return false;
  });
}

/**
 * Format notes for the TipTap editor.
 * Rich docs: tidy whitespace / empty paragraphs (keep marks & structure).
 * Plain-paragraph docs: run the text prettier then rebuild lists/headings.
 */
export function formatNotesDoc(doc: JSONContent): JSONContent {
  const tidied = formatTipTapNotesDoc(doc);

  if (!docLooksPlainParagraphsOnly(tidied)) {
    return promoteMarkdownListParagraphs(tidied);
  }

  const plain = vocabularyNotesToPlainText(serializeVocabularyNotes(tidied));
  return formatableTextToDoc(plain);
}

const BULLET_PARA_RE = /^([-*•●◦]|\u2022|\u00B7)\s+(.*)$/;
const NUMBER_PARA_RE = /^(\d+)[.)]\s+(.*)$/;

/** Turn leftover `- item` paragraphs into real TipTap lists (keeps marks). */
function promoteMarkdownListParagraphs(doc: JSONContent): JSONContent {
  const nodes = doc.content ?? [];
  const result: JSONContent[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.type !== "paragraph") {
      result.push(node);
      i += 1;
      continue;
    }

    const text = nodePlainText(node);
    const bullet = text.match(BULLET_PARA_RE);
    const numbered = text.match(NUMBER_PARA_RE);

    if (!bullet && !numbered) {
      result.push(node);
      i += 1;
      continue;
    }

    const isBullet = Boolean(bullet);
    const items: JSONContent[] = [];

    while (i < nodes.length) {
      const current = nodes[i]!;
      if (current.type !== "paragraph") break;
      const currentText = nodePlainText(current);
      const match = isBullet
        ? currentText.match(BULLET_PARA_RE)
        : currentText.match(NUMBER_PARA_RE);
      if (!match) break;

      const markerLength = currentText.length - (match[2]?.length ?? 0);
      items.push({
        type: "listItem",
        content: [stripParagraphPrefix(current, markerLength)],
      });
      i += 1;
    }

    result.push({
      type: isBullet ? "bulletList" : "orderedList",
      content: items,
    });
  }

  return { type: "doc", content: result };
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
