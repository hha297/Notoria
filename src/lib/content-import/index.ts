/**
 * Client-safe content-import exports.
 * Server-only analyze/extract/AI live in separate modules — do not re-export here.
 */

export {
  csvTemplateFilename,
  csvTemplateForTarget,
} from "@/lib/content-import/templates";
export {
  detectContentFormat,
  isAllowedContentImportFile,
  mimeFromContentFilename,
  resolveContentMime,
  titleFromFilename,
} from "@/lib/content-import/detect";
export { fieldsForTarget } from "@/lib/content-import/fields";
export {
  applyMappingOverrides,
  suggestColumnMappings,
} from "@/lib/content-import/map-columns";
export {
  MAX_CONTENT_IMPORT_FILE_BYTES,
  MAX_DOCUMENT_IMPORT_ROWS,
  MAX_VOCAB_IMPORT_ROWS,
  type AnalyzeContentImportResult,
  type ColumnMapping,
  type ConfirmContentImportInput,
  type ConfirmContentImportResult,
  type ContentImportFormat,
  type ContentImportTarget,
  type ImportFieldId,
  type VocabImportDraft,
  type DocumentImportDraft,
} from "@/lib/content-import/types";
