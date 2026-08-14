import { buildExportDocument, buildRichDocumentExport, exportDocumentIsEmpty } from "@/lib/writing/export/build-document";
import { generateWritingDocxBlob } from "@/lib/writing/export/docx";
import { downloadBlob } from "@/lib/writing/export/download";
import { buildExportFilename } from "@/lib/writing/export/filename";
import { generateWritingPdfBlob } from "@/lib/writing/export/pdf";
import type {
  ExportDocumentModel,
  ExportLabels,
  ExportOptions,
  ExportLayout,
} from "@/lib/writing/export/types";
import type { WritingEditorState } from "@/lib/writing/content";
import type { JSONContent } from "@tiptap/react";

export type { ExportFormat, ExportOptions, ExportLabels } from "@/lib/writing/export/types";
export { DEFAULT_EXPORT_OPTIONS } from "@/lib/writing/export/types";
export {
  buildExportDocument,
  buildRichDocumentExport,
  exportDocumentIsEmpty,
} from "@/lib/writing/export/build-document";
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

  return exportDocumentModel({
    model,
    options: params.options,
    labels: params.labels,
  });
}

export async function exportTheoryNote(params: {
  title: string;
  description?: string | null;
  doc: JSONContent;
  options: Pick<ExportOptions, "format">;
  labels: ExportLabels;
}): Promise<{ filename: string }> {
  const model = buildRichDocumentExport(
    params.title,
    params.doc,
    params.description ?? "",
  );

  return exportDocumentModel({
    model,
    options: {
      format: params.options.format,
      includeExampleAnswers: false,
      includeNotes: false,
      leaveBlankSpace: false,
    },
    labels: params.labels,
    filenamePrefix: "theory",
    layout: "document",
  });
}

export async function exportDocumentModel(params: {
  model: ExportDocumentModel;
  options: ExportOptions;
  labels: ExportLabels;
  filenamePrefix?: string;
  layout?: ExportLayout;
}): Promise<{ filename: string }> {
  if (exportDocumentIsEmpty(params.model)) {
    throw new Error("EMPTY_EXPORT");
  }

  const filename = buildExportFilename(
    params.model.title,
    params.options.format,
    new Date(),
    params.filenamePrefix,
  );
  const blob = await generateExportBlob(
    params.model,
    params.labels,
    params.options,
    params.layout ?? "worksheet",
  );
  downloadBlob(blob, filename);

  return { filename };
}

async function generateExportBlob(
  model: ExportDocumentModel,
  labels: ExportLabels,
  options: ExportOptions,
  layout: ExportLayout,
): Promise<Blob> {
  if (options.format === "docx") {
    return generateWritingDocxBlob(model, labels, options, layout);
  }

  return generateWritingPdfBlob(model, labels, options, layout);
}
