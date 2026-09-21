import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";

export type VocabularyWordRow = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  notes?: string | null;
  updatedAt: string;
  createdAt?: string;
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

export type VocabularyViewMode = "list" | "cards";
export type VocabularySortField = "updated" | "word";
export type VocabularySortDirection = "asc" | "desc";

export type VocabularyPosGroup = {
  key: string;
  words: VocabularyWordRow[];
};
