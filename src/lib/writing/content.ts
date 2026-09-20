import type { JSONContent } from "@tiptap/react";
import { normalizeTipTapHeadingLevels } from "@/lib/editor/heading-level";
import { stripTransientImages } from "@/lib/editor/images";
import {
  EMPTY_WRITING_META,
  parseWritingMeta,
  serializeWritingMeta,
  type WritingMeta,
} from "@/lib/writing/meta";

export const WRITING_CONTENT_VERSION = 1 as const;

export type WritingMode = "rich_document" | "question_set";

export type WritingQuestion = {
  id: string;
  prompt: string;
  exampleAnswer: string;
  notes: string;
  sortOrder: number;
};

export type WritingSection = {
  id: string;
  title: string;
  sortOrder: number;
  questions: WritingQuestion[];
};

export type RichDocumentContent = {
  mode: "rich_document";
  version: typeof WRITING_CONTENT_VERSION;
  doc: JSONContent;
  meta: WritingMeta;
};

export type QuestionSetContent = {
  mode: "question_set";
  version: typeof WRITING_CONTENT_VERSION;
  sections: WritingSection[];
  meta: WritingMeta;
};

export type WritingContent = RichDocumentContent | QuestionSetContent;

/** In-editor draft keeps both payloads so mode switches are non-destructive. */
export type WritingEditorState = {
  mode: WritingMode;
  doc: JSONContent;
  sections: WritingSection[];
  meta: WritingMeta;
};

export function createEmptyDoc(): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
}

export function createQuestion(sortOrder = 0): WritingQuestion {
  return {
    id: crypto.randomUUID(),
    prompt: "",
    exampleAnswer: "",
    notes: "",
    sortOrder,
  };
}

export function createSection(sortOrder = 0): WritingSection {
  return {
    id: crypto.randomUUID(),
    title: "",
    sortOrder,
    questions: [createQuestion(0)],
  };
}

export function createDefaultSections(): WritingSection[] {
  return [createSection(0)];
}

export function createDefaultEditorState(
  mode: WritingMode = "rich_document",
): WritingEditorState {
  return {
    mode,
    doc: createEmptyDoc(),
    sections: createDefaultSections(),
    meta: { ...EMPTY_WRITING_META },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTipTapDoc(value: unknown): value is JSONContent {
  return isRecord(value) && value.type === "doc";
}

function normalizeQuestion(raw: unknown, index: number): WritingQuestion {
  if (!isRecord(raw)) {
    return createQuestion(index);
  }

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    prompt: typeof raw.prompt === "string" ? raw.prompt : "",
    exampleAnswer:
      typeof raw.exampleAnswer === "string" ? raw.exampleAnswer : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : index,
  };
}

function normalizeSection(raw: unknown, index: number): WritingSection {
  if (!isRecord(raw)) {
    return createSection(index);
  }

  const questions = Array.isArray(raw.questions)
    ? raw.questions.map(normalizeQuestion)
    : [createQuestion(0)];

  return {
    id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === "string" ? raw.title : "",
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : index,
    questions: questions.length > 0 ? questions : [createQuestion(0)],
  };
}

/**
 * Accepts legacy TipTap docs (`{ type: "doc" }`) and the new wrapped shape.
 * Missing `meta` is filled with empty defaults for backward compatibility.
 */
export function parseWritingContent(raw: unknown): WritingContent {
  if (isTipTapDoc(raw) && !("mode" in raw)) {
    return {
      mode: "rich_document",
      version: WRITING_CONTENT_VERSION,
      doc: normalizeTipTapHeadingLevels(raw),
      meta: { ...EMPTY_WRITING_META },
    };
  }

  if (!isRecord(raw)) {
    return {
      mode: "rich_document",
      version: WRITING_CONTENT_VERSION,
      doc: createEmptyDoc(),
      meta: { ...EMPTY_WRITING_META },
    };
  }

  const meta = parseWritingMeta(raw.meta);

  if (raw.mode === "question_set") {
    const sections = Array.isArray(raw.sections)
      ? raw.sections.map(normalizeSection)
      : createDefaultSections();

    return {
      mode: "question_set",
      version: WRITING_CONTENT_VERSION,
      sections: sections.length > 0 ? sections : createDefaultSections(),
      meta,
    };
  }

  const doc = isTipTapDoc(raw.doc)
    ? normalizeTipTapHeadingLevels(raw.doc)
    : isTipTapDoc(raw)
      ? normalizeTipTapHeadingLevels(raw)
      : createEmptyDoc();

  return {
    mode: "rich_document",
    version: WRITING_CONTENT_VERSION,
    doc,
    meta,
  };
}

export function writingContentToEditorState(
  content: WritingContent,
): WritingEditorState {
  if (content.mode === "question_set") {
    return {
      mode: "question_set",
      doc: createEmptyDoc(),
      sections: content.sections,
      meta: { ...content.meta },
    };
  }

  return {
    mode: "rich_document",
    doc: content.doc,
    sections: createDefaultSections(),
    meta: { ...content.meta },
  };
}

export function serializeWritingContent(
  state: WritingEditorState,
): WritingContent {
  const meta = serializeWritingMeta(state.meta);

  if (state.mode === "question_set") {
    return {
      mode: "question_set",
      version: WRITING_CONTENT_VERSION,
      sections: state.sections.map((section, sectionIndex) => ({
        ...section,
        sortOrder: sectionIndex,
        questions: section.questions.map((question, questionIndex) => ({
          ...question,
          sortOrder: questionIndex,
        })),
      })),
      meta,
    };
  }

  return {
    mode: "rich_document",
    version: WRITING_CONTENT_VERSION,
    doc: stripTransientImages(state.doc),
    meta,
  };
}

export function writingContentHasPrompt(state: WritingEditorState): boolean {
  if (state.mode === "rich_document") {
    return true;
  }

  return state.sections.some((section) =>
    section.questions.some((question) => question.prompt.trim().length > 0),
  );
}

export function countWritingQuestions(sections: WritingSection[]): number {
  return sections.reduce(
    (total, section) => total + section.questions.length,
    0,
  );
}

export type WritingListMeta = {
  mode: WritingMode;
  sectionCount: number;
  questionCount: number;
  meta: WritingMeta;
  hasExportableContent: boolean;
};

export function coerceSqlBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "t" || normalized === "true" || normalized === "1";
  }
  return false;
}

function tipTapHasVisibleText(node: JSONContent | undefined): boolean {
  if (!node) return false;
  if (node.type === "text" && typeof node.text === "string") {
    return node.text.trim().length > 0;
  }
  return Boolean(node.content?.some((child) => tipTapHasVisibleText(child)));
}

export function getWritingListMeta(content: unknown): WritingListMeta {
  const parsed = parseWritingContent(content);

  if (parsed.mode === "rich_document") {
    return {
      mode: "rich_document",
      sectionCount: 0,
      questionCount: 0,
      meta: parsed.meta,
      hasExportableContent: tipTapHasVisibleText(parsed.doc),
    };
  }

  return {
    mode: "question_set",
    sectionCount: parsed.sections.length,
    questionCount: countWritingQuestions(parsed.sections),
    meta: parsed.meta,
    hasExportableContent: parsed.sections.some((section) =>
      section.questions.some((question) => question.prompt.trim().length > 0),
    ),
  };
}

/** Build list meta from SQL jsonb extracts so list queries never load TipTap docs. */
export function writingListMetaFromParts(input: {
  mode: string | null;
  sectionCount: number | string | null;
  questionCount: number | string | null;
  meta: unknown;
  hasExportableContent?: unknown;
}): WritingListMeta {
  const mode: WritingMode =
    input.mode === "rich_document" ? "rich_document" : "question_set";
  const sectionCount = Number(input.sectionCount ?? 0);
  const questionCount = Number(input.questionCount ?? 0);

  if (mode === "rich_document") {
    return {
      mode,
      sectionCount: 0,
      questionCount: 0,
      meta: parseWritingMeta(input.meta),
      hasExportableContent: coerceSqlBoolean(input.hasExportableContent),
    };
  }

  return {
    mode,
    sectionCount: Number.isFinite(sectionCount) ? sectionCount : 0,
    questionCount: Number.isFinite(questionCount) ? questionCount : 0,
    meta: parseWritingMeta(input.meta),
    hasExportableContent: coerceSqlBoolean(input.hasExportableContent),
  };
}
