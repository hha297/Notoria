import type { WritingMode } from "@/lib/writing/content";

export type ExportFormat = "pdf" | "docx";

export type ExportOptions = {
  format: ExportFormat;
  includeExampleAnswers: boolean;
  includeNotes: boolean;
  leaveBlankSpace: boolean;
};

export type ExportLabels = {
  documentHeading: string;
  titleLabel: string;
  sectionLabel: string;
  questionLabel: string;
  exampleAnswerLabel: string;
  notesLabel: string;
};

export type ExportQuestion = {
  prompt: string;
  exampleAnswer?: string;
  notes?: string;
};

export type ExportSection = {
  title: string;
  questions: ExportQuestion[];
};

export type ExportDocumentModel = {
  title: string;
  mode: WritingMode;
  sections: ExportSection[];
  /** Plain paragraphs extracted from rich TipTap docs. */
  paragraphs: string[];
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "pdf",
  includeExampleAnswers: true,
  includeNotes: true,
  leaveBlankSpace: true,
};

export const BLANK_LINE_COUNT = 4;
