import type {
  VocabularyExportDocument,
  VocabularyExportOptions,
  VocabularyExportRow,
} from "@/lib/vocabulary/export/types";

export type VocabularyExportSourceWord = {
  word: string;
  partOfSpeechLabel: string;
  meanings: string[];
  tagLabels: string[];
  notes: string;
  updatedAtLabel: string;
};

export function buildVocabularyExportDocument(
  workspaceName: string,
  words: VocabularyExportSourceWord[],
): VocabularyExportDocument {
  const rows: VocabularyExportRow[] = words.map((word) => ({
    word: word.word,
    partOfSpeech: word.partOfSpeechLabel,
    meanings: word.meanings,
    tags: word.tagLabels,
    notes: word.notes.trim(),
    updatedAt: word.updatedAtLabel,
  }));

  return {
    workspaceName: workspaceName.trim(),
    rows,
  };
}

export function vocabularyExportIsEmpty(document: VocabularyExportDocument) {
  return document.rows.length === 0;
}

export function joinMeanings(meanings: string[], separator = " • ") {
  return meanings.filter(Boolean).join(separator) || "—";
}

export function joinTags(tags: string[], separator = " | ") {
  return tags.filter(Boolean).join(separator) || "—";
}

export function visibleColumns(options: VocabularyExportOptions) {
  return {
    word: true as const,
    partOfSpeech: options.includePartOfSpeech,
    meanings: true as const,
    tags: options.includeTags,
    notes: options.includeNotes,
    updated: options.includeLastUpdated,
  };
}
