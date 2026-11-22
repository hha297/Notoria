export type FlashcardStudyMode = "word-to-meaning" | "meaning-to-word" | "mixed";

export type FlashcardCardDirection = "WORD_TO_MEANING" | "MEANING_TO_WORD";

export type FlashcardRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type FlashcardWordStatus = "NEW" | "LEARNING" | "REVIEW" | "MASTERED";

export type FlashcardExample = {
  sentence: string;
  /** Translation / gloss of the example sentence, when available. */
  meaning: string | null;
  /** Sense this example illustrates; null = word-level (unassigned). */
  meaningId: string | null;
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
  /** DB ids aligned with `meanings` (same index). */
  meaningIds?: string[];
  /** Non-primary senses shown as secondary on the flashcard answer face. */
  secondaryMeanings?: string[];
  /** DB ids aligned with `secondaryMeanings` (same index). */
  secondaryMeaningIds?: string[];
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

/** Practice-aware deck ordering (replaces misleading learning-status sorts). */
export type PracticeSortId =
  | "newest"
  | "oldest"
  | "last_practiced"
  | "least_recently_practiced"
  | "most_practiced"
  | "least_practiced";

export type FlashcardFilters = {
  tag: string[];
  partOfSpeech: string[];
  /** @deprecated Prefer practiceSort / recentlyAdded — kept for older saved prefs. */
  status: string[];
  /** Only words created within the last 48 hours. */
  recentlyAdded?: boolean;
  practiceSort?: PracticeSortId;
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
  recentlyAdded: false,
  practiceSort: "newest",
};

export const PRACTICE_SORT_OPTIONS: PracticeSortId[] = [
  "newest",
  "oldest",
  "last_practiced",
  "least_recently_practiced",
  "most_practiced",
  "least_practiced",
];
