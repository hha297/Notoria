import type { NoteBlock } from "@/lib/vocabulary/export/note-blocks";

export type VocabularyExportFormat = "pdf" | "csv" | "docx";

export type VocabularyExportOptions = {
  format: VocabularyExportFormat;
  includePartOfSpeech: boolean;
  includeTags: boolean;
  includeLastUpdated: boolean;
  includeNotes: boolean;
};

export type VocabularyExportLabels = {
  documentHeading: string;
  workspaceLabel: string;
  notesHeading: string;
  wordCount: string;
  uncategorizedPos?: string;
  formatWordCount?: (count: number) => string;
  columns: {
    word: string;
    partOfSpeech: string;
    meanings: string;
    tags: string;
    notes: string;
    updated: string;
  };
};

export type VocabularyExportRow = {
  word: string;
  partOfSpeech: string;
  meanings: string[];
  tags: string[];
  notes: string;
  noteBlocks: NoteBlock[];
  updatedAt: string;
};

export type VocabularyExportDocument = {
  workspaceName: string;
  rows: VocabularyExportRow[];
};

export const DEFAULT_VOCABULARY_EXPORT_OPTIONS: VocabularyExportOptions = {
  format: "pdf",
  includePartOfSpeech: true,
  includeTags: true,
  includeLastUpdated: true,
  includeNotes: true,
};
