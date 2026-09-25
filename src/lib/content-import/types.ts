/**
 * Shared content import pipeline for Vocabulary, Writing, Theory
 * (and future Practice reuse).
 *
 * Flow: File → Detect → Extract → Map → Validate → Preview → Confirm → Save
 */

export const CONTENT_IMPORT_TARGETS = [
  "vocabulary",
  "writing",
  "theory",
] as const;
export type ContentImportTarget = (typeof CONTENT_IMPORT_TARGETS)[number];

export const CONTENT_IMPORT_FORMATS = ["csv", "pdf", "docx", "txt"] as const;
export type ContentImportFormat = (typeof CONTENT_IMPORT_FORMATS)[number];

export const MAX_CONTENT_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_VOCAB_IMPORT_ROWS = 2000;
export const MAX_DOCUMENT_IMPORT_ROWS = 50;
export const MAX_PREVIEW_ROWS = 40;

export type VocabImportField =
  | "word"
  | "meaning"
  | "partOfSpeech"
  | "example"
  | "tags"
  | "notes"
  | "ignore";

export type DocumentImportField = "title" | "content" | "category" | "ignore";

export type ImportFieldId = VocabImportField | DocumentImportField;

export type ColumnMapping = {
  sourceColumn: string;
  sourceIndex: number;
  field: ImportFieldId;
};

export type ImportIssueCode =
  | "MISSING_WORD"
  | "MISSING_MEANING"
  | "MISSING_TITLE"
  | "MISSING_CONTENT"
  | "EMPTY_ROW"
  | "DUPLICATE_IN_FILE"
  | "INVALID_VALUE";

export type ImportIssue = {
  code: ImportIssueCode;
  rowIndex: number;
  message: string;
  /** Raw preview of the row for the user. */
  snippet?: string;
};

export type VocabImportDraft = {
  word: string;
  meanings: string[];
  partOfSpeech?: string;
  examples: string[];
  tags: string[];
  notes?: string;
  rowIndex: number;
  status: "ready" | "issue" | "skipped";
  issues: ImportIssue[];
};

export type DocumentImportDraft = {
  title: string;
  content: string;
  category?: string;
  rowIndex: number;
  status: "ready" | "issue" | "skipped";
  issues: ImportIssue[];
};

export type TabularExtract = {
  kind: "tabular";
  headers: string[];
  rows: string[][];
  /** Header row index in the original sheet (0-based among data lines). */
  headerRowIndex: number;
};

export type TextExtract = {
  kind: "text";
  text: string;
  titleHint?: string;
};

export type ContentExtract = TabularExtract | TextExtract;

export type AnalyzeContentImportResult = {
  target: ContentImportTarget;
  format: ContentImportFormat;
  fileName: string;
  extractKind: ContentExtract["kind"];
  headers: string[];
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  missingRequired: ImportFieldId[];
  /** Vocab drafts when target is vocabulary */
  vocabItems: VocabImportDraft[];
  /** Document drafts when target is writing | theory */
  documents: DocumentImportDraft[];
  readyCount: number;
  issueCount: number;
  skippedCount: number;
  issues: ImportIssue[];
  sampleRows: string[][];
  /** Full tabular rows (CSV) so the client can remapping without re-upload. */
  rows: string[][];
};

export type ConfirmContentImportInput = {
  target: ContentImportTarget;
  mappings: ColumnMapping[];
  /** Raw table used with remapped columns (CSV path). */
  headers?: string[];
  rows?: string[][];
  /** Pre-structured drafts (PDF/DOCX AI or text path). */
  vocabItems?: VocabImportDraft[];
  documents?: DocumentImportDraft[];
  skipIssueRows?: boolean;
};

export type ConfirmContentImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  /** Already present in the workspace (vocab duplicates, etc.). */
  skippedAlreadyExists: number;
  /** Issue rows, empty rows, or rows the user marked skipped. */
  skippedInvalid: number;
  /** Human-readable lines for the done screen. */
  details: Array<{
    kind: "already_exists" | "invalid" | "failed";
    rowIndex: number;
    label: string;
    message: string;
  }>;
};
