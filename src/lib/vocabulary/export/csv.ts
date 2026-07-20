import {
  joinMeanings,
  joinTags,
  visibleColumns,
} from "@/lib/vocabulary/export/build-document";
import type {
  VocabularyExportDocument,
  VocabularyExportLabels,
  VocabularyExportOptions,
} from "@/lib/vocabulary/export/types";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateVocabularyCsvBlob(
  document: VocabularyExportDocument,
  labels: VocabularyExportLabels,
  options: VocabularyExportOptions,
): Blob {
  const columns = visibleColumns(options);
  const headers: string[] = [labels.columns.word];

  if (columns.partOfSpeech) headers.push(labels.columns.partOfSpeech);
  headers.push(labels.columns.meanings);
  if (columns.tags) headers.push(labels.columns.tags);
  if (columns.notes) headers.push(labels.columns.notes);
  if (columns.updated) headers.push(labels.columns.updated);

  const lines = [headers.map(escapeCsvCell).join(",")];

  for (const row of document.rows) {
    const cells: string[] = [row.word];

    if (columns.partOfSpeech) cells.push(row.partOfSpeech);
    cells.push(joinMeanings(row.meanings, " | "));
    if (columns.tags) cells.push(joinTags(row.tags));
    if (columns.notes) cells.push(row.notes || "");
    if (columns.updated) cells.push(row.updatedAt);

    lines.push(cells.map(escapeCsvCell).join(","));
  }

  // BOM helps Excel detect UTF-8
  const csv = `\uFEFF${lines.join("\r\n")}`;
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
