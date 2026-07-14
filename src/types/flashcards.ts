export type FlashcardStudyMode = "word-to-meaning" | "meaning-to-word" | "mixed";

export type FlashcardCardDirection = "WORD_TO_MEANING" | "MEANING_TO_WORD";

export type FlashcardRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type FlashcardWordStatus = "NEW" | "LEARNING" | "REVIEW" | "MASTERED";

export type FlashcardWord = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  notes: string | null;
  status: FlashcardWordStatus;
  meanings: string[];
  examples: string[];
  tags: string[];
};

export type FlashcardFilters = {
  tag: string;
  partOfSpeech: string;
  status: string;
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
  tag: "all",
  partOfSpeech: "all",
  status: "all",
};
