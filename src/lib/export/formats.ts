/** Canonical export format order: PDF → DOCX → CSV */
export const DOCUMENT_EXPORT_FORMATS = ["pdf", "docx"] as const;
export const VOCABULARY_EXPORT_FORMATS = ["pdf", "docx", "csv"] as const;

export type DocumentExportFormat = (typeof DOCUMENT_EXPORT_FORMATS)[number];
export type VocabularyExportFormat = (typeof VOCABULARY_EXPORT_FORMATS)[number];
export type ExportFormatId = DocumentExportFormat | "csv";

/** Default when an export dialog opens: Pro → PDF, Free → CSV (or PDF if CSV unavailable). */
export function getDefaultExportFormat(
  hasProAccess: boolean,
  formats: readonly ExportFormatId[],
): ExportFormatId {
  if (hasProAccess && formats.includes("pdf")) {
    return "pdf";
  }
  if (formats.includes("csv")) {
    return "csv";
  }
  return formats[0] ?? "pdf";
}
