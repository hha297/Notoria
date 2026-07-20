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
