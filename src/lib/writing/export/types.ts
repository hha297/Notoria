import type { JSONContent } from "@tiptap/react";
import type { WritingMode } from "@/lib/writing/content";
import {
  DEFAULT_EXPORT_APPEARANCE,
  type ExportAppearance,
} from "@/lib/export/print-theme";

export type ExportFormat = "pdf" | "docx";

export type ExportLayout = "worksheet" | "document";

export type ExportOptions = {
  format: ExportFormat;
  includeExampleAnswers: boolean;
  includeNotes: boolean;
  leaveBlankSpace: boolean;
  /** Print-friendly (default) or resolved current theme colors. */
  appearance: ExportAppearance;
  /** next-themes resolved mode when appearance is "theme". */
  themeMode?: "light" | "dark";
};

export type ExportLabels = {
  documentHeading: string;
  titleLabel: string;
  descriptionLabel: string;
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
  description: string;
  mode: WritingMode;
  sections: ExportSection[];
  /** Plain paragraphs for rich_document DOCX export. */
  paragraphs: string[];
  /** TipTap JSON for rich_document PDF export (preserves formatting). */
  doc: JSONContent | null;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "pdf",
  includeExampleAnswers: true,
  includeNotes: true,
  leaveBlankSpace: true,
  appearance: DEFAULT_EXPORT_APPEARANCE,
};

export const BLANK_LINE_COUNT = 4;
