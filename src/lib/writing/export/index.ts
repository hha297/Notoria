import { buildExportDocument, exportDocumentIsEmpty } from "@/lib/writing/export/build-document";
import { generateWritingDocxBlob } from "@/lib/writing/export/docx";
import { downloadBlob } from "@/lib/writing/export/download";
import { buildExportFilename } from "@/lib/writing/export/filename";
import { generateWritingPdfBlob } from "@/lib/writing/export/pdf";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportOptions,
} from "@/lib/writing/export/types";
import type { WritingEditorState } from "@/lib/writing/content";

export type { ExportFormat, ExportOptions, ExportLabels } from "@/lib/writing/export/types";
export { DEFAULT_EXPORT_OPTIONS } from "@/lib/writing/export/types";
export { buildExportDocument, exportDocumentIsEmpty } from "@/lib/writing/export/build-document";
export { buildExportFilename } from "@/lib/writing/export/filename";

export async function exportWritingExercise(params: {
  title: string;
  description?: string | null;
  state: WritingEditorState;
  options: ExportOptions;
  labels: ExportLabels;
}): Promise<{ filename: string }> {
  const model = buildExportDocument(
    params.title,
    params.state,
    params.options,
    params.description ?? "",
  );

  if (exportDocumentIsEmpty(model)) {
    throw new Error("EMPTY_EXPORT");
  }

  const filename = buildExportFilename(model.title, params.options.format);
  const blob = await generateExportBlob(model, params.labels, params.options);
  downloadBlob(blob, filename);

  return { filename };
}

async function generateExportBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  options: ExportOptions,
): Promise<Blob> {
  if (options.format === "docx") {
    return generateWritingDocxBlob(model, labels, options);
  }

  return generateWritingPdfBlob(model, labels, options);
}
