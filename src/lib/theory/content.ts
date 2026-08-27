import type { JSONContent } from "@tiptap/react";
import { stripTransientImages } from "@/lib/editor/images";

export const THEORY_CONTENT_VERSION = 1 as const;

export const THEORY_CATEGORIES = [
  "grammar",
  "vocabulary",
  "pronunciation",
  "writing",
  "communication",
  "usage",
  "culture",
] as const;

export type TheoryCategory = (typeof THEORY_CATEGORIES)[number];

export type TheoryNoteContent = {
  kind: "theory";
  version: typeof THEORY_CONTENT_VERSION;
  category: string;
  description: string;
  doc: JSONContent;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTipTapDoc(value: unknown): value is JSONContent {
  return isRecord(value) && value.type === "doc";
}

export function createEmptyTheoryDoc(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

/** Build a TipTap doc from plain imported text (one paragraph per line block). */
export function plainTextToTheoryDoc(text: string): JSONContent {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 400);

  if (paragraphs.length === 0) {
    return createEmptyTheoryDoc();
  }

  return {
    type: "doc",
    content: paragraphs.map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    })),
  };
}

export function isKnownTheoryCategory(
  category: string | null | undefined,
): category is TheoryCategory {
  return (
    typeof category === "string" &&
    (THEORY_CATEGORIES as readonly string[]).includes(category)
  );
}

/** Older category slugs map onto the current set without a DB migration. */
const LEGACY_CATEGORY_MAP: Record<string, TheoryCategory> = {
  basics: "grammar",
  structure: "writing",
  formal: "usage",
  informal: "usage",
  expressions: "usage",
  mistakes: "grammar",
  speaking: "communication",
  listening: "communication",
  reading: "writing",
  word_usage: "usage",
};

function normalizeCategory(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "grammar";
  }
  const trimmed = value.trim();
  return LEGACY_CATEGORY_MAP[trimmed] ?? trimmed;
}

function collectText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }
  if (!node.content?.length) return "";
  return node.content.map(collectText).join(" ");
}

export function theoryDocPlainText(doc: JSONContent): string {
  return collectText(doc).replace(/\s+/g, " ").trim();
}

export function theoryExcerpt(text: string, maxLength = 140): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function estimateReadingMinutes(doc: JSONContent): number {
  const words = theoryDocPlainText(doc).split(" ").filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.round(words / 180));
}

export function parseTheoryContent(raw: unknown): TheoryNoteContent {
  if (!isRecord(raw)) {
    return {
      kind: "theory",
      version: THEORY_CONTENT_VERSION,
      category: "grammar",
      description: "",
      doc: createEmptyTheoryDoc(),
    };
  }

  const { category, description, doc, ...rest } = raw;
  const trimmedCategory = normalizeCategory(category);
  const trimmedDescription =
    typeof description === "string" ? description.trim() : "";

  return {
    ...rest,
    kind: "theory",
    version: THEORY_CONTENT_VERSION,
    category: trimmedCategory,
    description: trimmedDescription,
    doc: isTipTapDoc(doc) ? doc : createEmptyTheoryDoc(),
  };
}

export function serializeTheoryContent(
  content: Pick<TheoryNoteContent, "category" | "description" | "doc"> &
    Partial<TheoryNoteContent>,
): TheoryNoteContent {
  return parseTheoryContent({
    ...content,
    doc: stripTransientImages(content.doc),
    kind: "theory",
    version: THEORY_CONTENT_VERSION,
  });
}

export type TheoryListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  folderId: string | null;
  readingMinutes: number;
  updatedAt: string;
};

export function toTheoryListItem(note: {
  id: string;
  title: string;
  content: unknown;
  folderId?: string | null;
  updatedAt: Date | string;
}): TheoryListItem {
  const parsed = parseTheoryContent(note.content);
  const excerpt =
    parsed.description || theoryExcerpt(theoryDocPlainText(parsed.doc));

  return {
    id: note.id,
    title: note.title,
    description: excerpt,
    category: parsed.category,
    folderId: note.folderId ?? null,
    readingMinutes: estimateReadingMinutes(parsed.doc),
    updatedAt:
      typeof note.updatedAt === "string"
        ? note.updatedAt
        : note.updatedAt.toISOString(),
  };
}
