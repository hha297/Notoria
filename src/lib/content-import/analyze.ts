import { structureVocabularyWithAi } from "@/lib/content-import/ai-structure";
import {
  missingRequiredMappings,
  suggestColumnMappings,
  unmappedSourceColumns,
} from "@/lib/content-import/map-columns";
import { documentFromPlainText, mapDocumentRows } from "@/lib/content-import/map-document";
import {
  mapVocabRows,
  parseVocabLinesFromText,
} from "@/lib/content-import/map-vocab";
import type {
  AnalyzeContentImportResult,
  ColumnMapping,
  ContentExtract,
  ContentImportFormat,
  ContentImportTarget,
  DocumentImportDraft,
  VocabImportDraft,
} from "@/lib/content-import/types";
import { MAX_PREVIEW_ROWS } from "@/lib/content-import/types";

function summarize(
  vocabItems: VocabImportDraft[],
  documents: DocumentImportDraft[],
) {
  const pool = vocabItems.length > 0 ? vocabItems : documents;
  return {
    readyCount: pool.filter((item) => item.status === "ready").length,
    issueCount: pool.filter((item) => item.status === "issue").length,
    skippedCount: pool.filter((item) => item.status === "skipped").length,
    issues: pool.flatMap((item) => item.issues),
  };
}

export async function analyzeExtractedContent(input: {
  target: ContentImportTarget;
  format: ContentImportFormat;
  fileName: string;
  extract: ContentExtract;
  mappings?: ColumnMapping[];
}): Promise<AnalyzeContentImportResult> {
  const { target, format, fileName, extract } = input;

  if (extract.kind === "tabular") {
    const mappings =
      input.mappings ?? suggestColumnMappings(extract.headers, target);
    const missingRequired = missingRequiredMappings(mappings, target);
    const unmappedColumns = unmappedSourceColumns(mappings);

    let vocabItems: VocabImportDraft[] = [];
    let documents: DocumentImportDraft[] = [];

    if (target === "vocabulary") {
      vocabItems =
        missingRequired.length === 0
          ? mapVocabRows(extract.rows, mappings)
          : [];
    } else {
      documents =
        missingRequired.length === 0
          ? mapDocumentRows(extract.rows, mappings)
          : [];
    }

    const stats = summarize(vocabItems, documents);

    return {
      target,
      format,
      fileName,
      extractKind: "tabular",
      headers: extract.headers,
      mappings,
      unmappedColumns,
      missingRequired,
      vocabItems,
      documents,
      ...stats,
      sampleRows: extract.rows.slice(0, MAX_PREVIEW_ROWS),
      rows: extract.rows,
    };
  }

  // Free-form text / PDF / DOCX
  if (target === "vocabulary") {
    const aiItems = await structureVocabularyWithAi(extract.text);
    const vocabItems = aiItems ?? parseVocabLinesFromText(extract.text);
    const stats = summarize(vocabItems, []);
    return {
      target,
      format,
      fileName,
      extractKind: "text",
      headers: [],
      mappings: [],
      unmappedColumns: [],
      missingRequired: [],
      vocabItems,
      documents: [],
      ...stats,
      sampleRows: [],
      rows: [],
    };
  }

  const documents = [
    documentFromPlainText({
      title: extract.titleHint || "Imported document",
      text: extract.text,
    }),
  ];
  const stats = summarize([], documents);
  return {
    target,
    format,
    fileName,
    extractKind: "text",
    headers: [],
    mappings: [],
    unmappedColumns: [],
    missingRequired: [],
    vocabItems: [],
    documents,
    ...stats,
    sampleRows: [],
    rows: [],
  };
}

/** Re-run mapping after the user edits column → field assignments. */
export function reanalyzeWithMappings(input: {
  target: ContentImportTarget;
  format: ContentImportFormat;
  fileName: string;
  headers: string[];
  rows: string[][];
  mappings: ColumnMapping[];
}): AnalyzeContentImportResult {
  const missingRequired = missingRequiredMappings(input.mappings, input.target);
  const unmappedColumns = unmappedSourceColumns(input.mappings);

  let vocabItems: VocabImportDraft[] = [];
  let documents: DocumentImportDraft[] = [];

  if (missingRequired.length === 0) {
    if (input.target === "vocabulary") {
      vocabItems = mapVocabRows(input.rows, input.mappings);
    } else {
      documents = mapDocumentRows(input.rows, input.mappings);
    }
  }

  const stats = summarize(vocabItems, documents);
  return {
    target: input.target,
    format: input.format,
    fileName: input.fileName,
    extractKind: "tabular",
    headers: input.headers,
    mappings: input.mappings,
    unmappedColumns,
    missingRequired,
    vocabItems,
    documents,
    ...stats,
    sampleRows: input.rows.slice(0, MAX_PREVIEW_ROWS),
    rows: input.rows,
  };
}
