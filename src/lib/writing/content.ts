import type { JSONContent } from "@tiptap/react";

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
};

export type QuestionSetContent = {
  mode: "question_set";
  version: typeof WRITING_CONTENT_VERSION;
  sections: WritingSection[];
};

export type WritingContent = RichDocumentContent | QuestionSetContent;

/** In-editor draft keeps both payloads so mode switches are non-destructive. */
export type WritingEditorState = {
  mode: WritingMode;
  doc: JSONContent;
  sections: WritingSection[];
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
 */
export function parseWritingContent(raw: unknown): WritingContent {
  if (isTipTapDoc(raw) && !("mode" in raw)) {
    return {
      mode: "rich_document",
      version: WRITING_CONTENT_VERSION,
      doc: raw,
    };
  }

  if (!isRecord(raw)) {
    return {
      mode: "rich_document",
      version: WRITING_CONTENT_VERSION,
      doc: createEmptyDoc(),
    };
  }

  if (raw.mode === "question_set") {
    const sections = Array.isArray(raw.sections)
      ? raw.sections.map(normalizeSection)
      : createDefaultSections();

    return {
      mode: "question_set",
      version: WRITING_CONTENT_VERSION,
      sections: sections.length > 0 ? sections : createDefaultSections(),
    };
  }

  const doc = isTipTapDoc(raw.doc)
    ? raw.doc
    : isTipTapDoc(raw)
      ? raw
      : createEmptyDoc();

  return {
    mode: "rich_document",
    version: WRITING_CONTENT_VERSION,
    doc,
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
    };
  }

  return {
    mode: "rich_document",
    doc: content.doc,
    sections: createDefaultSections(),
  };
}

export function serializeWritingContent(
  state: WritingEditorState,
): WritingContent {
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
    };
  }

  return {
    mode: "rich_document",
    version: WRITING_CONTENT_VERSION,
    doc: state.doc,
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
  return sections.reduce((total, section) => total + section.questions.length, 0);
}
