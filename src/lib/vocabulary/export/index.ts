import { buildVocabularyExportDocument, vocabularyExportIsEmpty } from "@/lib/vocabulary/export/build-document";
import { generateVocabularyCsvBlob } from "@/lib/vocabulary/export/csv";
import { generateVocabularyDocxBlob } from "@/lib/vocabulary/export/docx";
import { buildVocabularyExportFilename } from "@/lib/vocabulary/export/filename";
import { generateVocabularyPdfBlob } from "@/lib/vocabulary/export/pdf";
import type {
  VocabularyExportDocument,
  VocabularyExportLabels,
  VocabularyExportOptions,
} from "@/lib/vocabulary/export/types";
import type { VocabularyExportSourceWord } from "@/lib/vocabulary/export/build-document";
import { downloadBlob } from "@/lib/writing/export/download";

export type {
  VocabularyExportFormat,
  VocabularyExportOptions,
  VocabularyExportLabels,
} from "@/lib/vocabulary/export/types";
export { DEFAULT_VOCABULARY_EXPORT_OPTIONS } from "@/lib/vocabulary/export/types";

export async function exportVocabulary(params: {
  workspaceName: string;
  words: VocabularyExportSourceWord[];
  options: VocabularyExportOptions;
  labels: VocabularyExportLabels;
}): Promise<{ filename: string }> {
  const document = buildVocabularyExportDocument(
    params.workspaceName,
    params.words,
  );

  if (vocabularyExportIsEmpty(document)) {
    throw new Error("EMPTY_EXPORT");
  }

  const filename = buildVocabularyExportFilename(
    params.workspaceName,
    params.options.format,
  );
  const blob = await generateBlob(document, params.labels, params.options);
  downloadBlob(blob, filename);

  return { filename };
}

async function generateBlob(
  document: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
): Promise<Blob> {
  switch (options.format) {
    case "csv":
      return generateVocabularyCsvBlob(document, labels, options);
    case "docx":
      return generateVocabularyDocxBlob(document, labels, options);
    case "pdf":
    default:
      return generateVocabularyPdfBlob(document, labels, options);
  }
}
