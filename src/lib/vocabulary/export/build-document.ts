import {
  noteBlocksToPlainText,
  notesToBlocks,
} from "@/lib/vocabulary/export/note-blocks";
import {
  reportProgress,
  yieldToMain,
  type VocabularyExportProgressHandler,
} from "@/lib/vocabulary/export/progress";
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

const PREPARE_YIELD_EVERY = 40;

export async function buildVocabularyExportDocument(
  workspaceName: string,
  words: VocabularyExportSourceWord[],
  options: Pick<VocabularyExportOptions, "includeNotes">,
  onProgress?: VocabularyExportProgressHandler,
): Promise<VocabularyExportDocument> {
  const rows: VocabularyExportRow[] = [];
  const total = words.length;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const noteBlocks = options.includeNotes ? notesToBlocks(word.notes) : [];
    rows.push({
      word: word.word,
      partOfSpeech: word.partOfSpeechLabel,
      meanings: word.meanings,
      tags: word.tagLabels,
      notes: options.includeNotes ? noteBlocksToPlainText(noteBlocks) : "",
      noteBlocks,
      updatedAt: word.updatedAtLabel,
    });

    if (
      index === 0 ||
      (index + 1) % PREPARE_YIELD_EVERY === 0 ||
      index + 1 === total
    ) {
      reportProgress(onProgress, {
        phase: "preparing",
        current: index + 1,
        total,
      });
      await yieldToMain();
    }
  }

  return {
    workspaceName: workspaceName.trim(),
    rows,
  };
}

export function vocabularyExportIsEmpty(document: VocabularyExportDocument) {
  return document.rows.length === 0;
}

export function joinMeanings(meanings: string[], separator = " · ") {
  return meanings.filter(Boolean).join(separator);
}

export function joinTags(tags: string[], separator = " · ") {
  return tags.filter(Boolean).join(separator);
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
