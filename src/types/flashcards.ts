export type FlashcardStudyMode = "word-to-meaning" | "meaning-to-word" | "mixed";

export type FlashcardCardDirection = "WORD_TO_MEANING" | "MEANING_TO_WORD";

export type FlashcardRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type FlashcardWordStatus = "NEW" | "LEARNING" | "REVIEW" | "MASTERED";

export type FlashcardExample = {
  sentence: string;
  /** Translation / gloss of the example sentence, when available. */
  meaning: string | null;
};

export type FlashcardWord = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  synonyms: string | null;
  notes: string | null;
  status: FlashcardWordStatus;
  /** ISO timestamp of vocabulary creation (newest → oldest selection). */
  createdAt: string;
  /** Primary meanings — used by exercises and as the main flashcard answer. */
  meanings: string[];
  /** Non-primary senses shown as secondary on the flashcard answer face. */
  secondaryMeanings?: string[];
  /**
   * Usage labels aligned with `meanings` (same index).
   * Retained for context; do not surface as the answer face.
   */
  meaningUsageLabels?: string[][];
  /** Example sentences only — used by fill-blank / AI avoid lists. */
  examples: string[];
  /** Full example rows for flashcard display (sentence + translation). */
  exampleEntries?: FlashcardExample[];
  tags: string[];
};

export type FlashcardFilters = {
  tag: string[];
  partOfSpeech: string[];
  status: string[];
};

export type FlashcardSessionState = {
  workspaceId: string;
  filtersKey: string;
  studyMode: FlashcardStudyMode;
  cardIds: string[];
  directions: Record<string, FlashcardCardDirection>;
  currentIndex: number;
  isFlipped: boolean;
};

export const DEFAULT_FLASHCARD_FILTERS: FlashcardFilters = {
  tag: [],
  partOfSpeech: [],
  status: [],
};
