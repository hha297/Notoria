import type { JSONContent } from "@tiptap/react";
import { formatVocabularyNotes } from "@/lib/vocabulary/format-notes";
import {
  formatTiptapDocument,
  tipTapNodePlainText,
} from "@/lib/editor/format-document";
import {
  coerceHeadingLevel,
  normalizeTipTapHeadingLevels,
} from "@/lib/editor/heading-level";
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
        return normalizeTipTapHeadingLevels(parsed);
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
  return tipTapNodePlainText(node);
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
        const level = coerceHeadingLevel(node.attrs?.level);
        blocks.push(`${"#".repeat(level)} ${nodePlainText(node).trim()}`);
        continue;
      }
      if (node.type === "horizontalRule") {
        blocks.push("---");
        continue;
      }
      if (node.type === "table") {
        const rows = (node.content ?? []).map((row) =>
          (row.content ?? [])
            .map((cell) => nodePlainText(cell).trim())
            .join(" | "),
        );
        blocks.push(...rows.filter(Boolean));
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
    if (node.type === "table") {
      return (node.content?.length ?? 0) > 0;
    }
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

/**
 * Format notes for the TipTap editor (shared deterministic formatter).
 */
export function formatTipTapNotesDoc(doc: JSONContent): JSONContent {
  return formatTiptapDocument(doc);
}

/**
 * Format notes for the TipTap editor.
 * Uses the shared document formatter for structure cleanup.
 * Plain-paragraph-only docs still rebuild via the text prettier for legacy markdown.
 */
export function formatNotesDoc(doc: JSONContent): JSONContent {
  const tidied = formatTiptapDocument(doc);

  if (!docLooksPlainParagraphsOnly(tidied)) {
    return tidied;
  }

  // Plain docs: text prettier can still recover markdown-ish structure.
  const plain = vocabularyNotesToPlainText(serializeVocabularyNotes(tidied));
  if (!plain.trim()) {
    return structuredClone(EMPTY_NOTES_DOC);
  }
  return formatTiptapDocument(formatableTextToDoc(plain));
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
