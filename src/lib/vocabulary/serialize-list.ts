import type { VocabularyWordRow } from "@/components/vocabulary/vocabulary-table";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";

type VocabularyListWord = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  notes?: string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
  meanings: Array<{
    id: string;
    meaning: string;
    isPrimary?: boolean;
    sortOrder: number;
  }>;
  examples: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>;
  synonymRefs: VocabularySynonymRef[];
  tags: Array<{ id: string; tag: string }>;
};

function toIso(value: Date | string) {
  return typeof value === "string" ? value : value.toISOString();
}

export function serializeVocabularyListWords(
  words: VocabularyListWord[],
): VocabularyWordRow[] {
  return words.map((word) => ({
    id: word.id,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    notes: word.notes,
    updatedAt: toIso(word.updatedAt),
    createdAt: toIso(word.createdAt),
    meanings: word.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      isPrimary: meaning.isPrimary,
      sortOrder: meaning.sortOrder,
    })),
    examples: word.examples.map((example) => ({
      id: example.id,
      sentence: example.sentence,
      meaning: example.meaning,
      notes: example.notes,
      sortOrder: example.sortOrder,
    })),
    synonymRefs: word.synonymRefs,
    tags: word.tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
  }));
}
