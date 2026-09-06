import type { JSONContent } from "@tiptap/react";
import { serializeVocabularyNotes } from "@/lib/vocabulary/notes-content";
import { normalizeWordTags } from "@/lib/vocabulary-tags";
import { normalizeVocabularyWord } from "@/lib/vocabulary/word-identity";

export type VocabularyFormSnapshot = {
  word: string;
  partOfSpeech: string | null;
  notes: string;
  meanings: Array<{ meaning: string; isPrimary: boolean }>;
  examples: Array<{ sentence: string; meaning: string; notes: string }>;
  tags: string[];
  synonymIds: string[];
};

type MeaningLike = {
  meaning: string;
  isPrimary: boolean;
};

type ExampleLike = {
  sentence: string;
  meaning: string;
  notes: string;
};

/** Normalize editable vocabulary form values into a comparable snapshot. */
export function buildVocabularyFormSnapshot(input: {
  word: string;
  partOfSpeech?: string | null;
  notesDoc: JSONContent;
  meanings: MeaningLike[];
  examples: ExampleLike[];
  tags: string[];
  customTags?: string[];
  synonymIds: string[];
}): VocabularyFormSnapshot {
  return {
    word: normalizeVocabularyWord(input.word),
    partOfSpeech: input.partOfSpeech?.trim() || null,
    notes: serializeVocabularyNotes(input.notesDoc),
    meanings: input.meanings
      .map((item) => ({
        meaning: item.meaning.trim(),
        isPrimary: item.isPrimary,
      }))
      .filter((item) => item.meaning.length > 0),
    examples: input.examples
      .map((item) => ({
        sentence: item.sentence.trim(),
        meaning: item.meaning.trim(),
        notes: item.notes.trim(),
      }))
      .filter((item) => item.sentence.length > 0),
    tags: normalizeWordTags(input.tags, input.customTags).slice().sort(),
    synonymIds: [...new Set(input.synonymIds)].sort(),
  };
}

export function vocabularyFormSnapshotsEqual(
  a: VocabularyFormSnapshot,
  b: VocabularyFormSnapshot,
) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function vocabularyFormHasRequiredContent(
  snapshot: VocabularyFormSnapshot,
) {
  return snapshot.word.length > 0 && snapshot.meanings.length > 0;
}
