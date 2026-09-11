import type {
  FlashcardCardDirection,
  FlashcardFilters,
  FlashcardSessionState,
  FlashcardStudyMode,
  FlashcardWord,
} from "@/types/flashcards";
import { sampleSessionItems } from "@/lib/exercises/session-size";
import {
  matchesMultiFilter,
  matchesMultiFilterAny,
  multiFilterKey,
} from "@/lib/filters/multi-select";

export function getFiltersKey(filters: FlashcardFilters, studyMode: FlashcardStudyMode) {
  return [
    studyMode,
    multiFilterKey(filters.tag),
    multiFilterKey(filters.partOfSpeech),
    multiFilterKey(filters.status),
  ].join(":");
}

export function filterFlashcardWords(
  words: FlashcardWord[],
  filters: FlashcardFilters,
) {
  return words.filter((word) => {
    if (!matchesMultiFilter(filters.partOfSpeech, word.partOfSpeech)) {
      return false;
    }

    if (!matchesMultiFilter(filters.status, word.status)) {
      return false;
    }

    if (!matchesMultiFilterAny(filters.tag, word.tags)) {
      return false;
    }

    return true;
  });
}

export function resolveCardDirection(
  studyMode: FlashcardStudyMode,
  wordId: string,
  directions: Record<string, FlashcardCardDirection>,
): FlashcardCardDirection {
  if (studyMode === "word-to-meaning") {
    return "WORD_TO_MEANING";
  }

  if (studyMode === "meaning-to-word") {
    return "MEANING_TO_WORD";
  }

  return directions[wordId] ?? "WORD_TO_MEANING";
}

export function buildSessionDirections(
  words: FlashcardWord[],
  studyMode: FlashcardStudyMode,
): Record<string, FlashcardCardDirection> {
  if (studyMode !== "mixed") {
    return {};
  }

  return Object.fromEntries(
    words.map((word) => [
      word.id,
      Math.random() > 0.5 ? "WORD_TO_MEANING" : "MEANING_TO_WORD",
    ]),
  ) as Record<string, FlashcardCardDirection>;
}

export function createSessionState({
  workspaceId,
  words,
  filters,
  studyMode,
  currentIndex = 0,
  isFlipped = false,
  softAvoidWordIds,
}: {
  workspaceId: string;
  words: FlashcardWord[];
  filters: FlashcardFilters;
  studyMode: FlashcardStudyMode;
  currentIndex?: number;
  isFlipped?: boolean;
  softAvoidWordIds?: Iterable<string>;
}): FlashcardSessionState {
  const sessionWords = sampleSessionItems(words, "flashcards", {
    getWordId: (word) => word.id,
    getCreatedAt: (word) => word.createdAt,
    softAvoidWordIds,
  });

  return {
    workspaceId,
    filtersKey: getFiltersKey(filters, studyMode),
    studyMode,
    cardIds: sessionWords.map((word) => word.id),
    directions: buildSessionDirections(sessionWords, studyMode),
    currentIndex,
    isFlipped,
  };
}

export function getSessionStorageKey(workspaceId: string) {
  return `notoria-flashcards-${workspaceId}`;
}

export function loadSessionState(workspaceId: string): FlashcardSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(getSessionStorageKey(workspaceId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as FlashcardSessionState;
  } catch {
    return null;
  }
}

export function saveSessionState(state: FlashcardSessionState) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(
    getSessionStorageKey(state.workspaceId),
    JSON.stringify(state),
  );
}

export function clearSessionState(workspaceId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(getSessionStorageKey(workspaceId));
}

export function canRestoreSession(
  saved: FlashcardSessionState | null,
  workspaceId: string,
  filtersKey: string,
  availableIds: Set<string>,
) {
  if (!saved || saved.workspaceId !== workspaceId || saved.filtersKey !== filtersKey) {
    return false;
  }

  if (saved.cardIds.length === 0) {
    return false;
  }

  return saved.cardIds.every((id) => availableIds.has(id));
}
