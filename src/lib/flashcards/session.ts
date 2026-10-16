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
  softPreferWordIds,
}: {
  workspaceId: string;
  words: FlashcardWord[];
  filters: FlashcardFilters;
  studyMode: FlashcardStudyMode;
  currentIndex?: number;
  isFlipped?: boolean;
  softAvoidWordIds?: Iterable<string>;
  softPreferWordIds?: Iterable<string>;
}): FlashcardSessionState {
  const sessionWords = sampleSessionItems(words, "flashcards", {
    getWordId: (word) => word.id,
    getCreatedAt: (word) => word.createdAt,
    softAvoidWordIds,
    softPreferWordIds,
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

/**
 * Restore when workspace + filters match. Card IDs are frozen for the session —
 * do not require every ID to still pass the live filtered word list (rating can
 * change status / due order without restarting the deck).
 */
export function canRestoreSession(
  saved: FlashcardSessionState | null,
  workspaceId: string,
  filtersKey: string,
  _availableIds?: Set<string>,
) {
  if (!saved || saved.workspaceId !== workspaceId || saved.filtersKey !== filtersKey) {
    return false;
  }

  if (saved.cardIds.length === 0) {
    return false;
  }

  const maxIndex = saved.cardIds.length - 1;
  if (
    !Number.isFinite(saved.currentIndex) ||
    saved.currentIndex < 0 ||
    saved.currentIndex > maxIndex
  ) {
    return false;
  }

  return true;
}

/** Keep an in-memory session across word refreshes when filters are unchanged. */
export function shouldKeepActiveSession(
  session: FlashcardSessionState | null,
  workspaceId: string,
  filtersKey: string,
) {
  return Boolean(
    session &&
      session.workspaceId === workspaceId &&
      session.filtersKey === filtersKey &&
      session.cardIds.length > 0,
  );
}

/**
 * If the current card left the loaded word map, advance to the next resolvable
 * card without resetting completed progress. Returns null when the session is done.
 */
export function reconcileSessionCursor(
  session: FlashcardSessionState,
  hasWord: (id: string) => boolean,
): FlashcardSessionState | null {
  const { cardIds, currentIndex } = session;
  if (cardIds.length === 0) return null;

  const clampedIndex = Math.min(Math.max(0, currentIndex), cardIds.length - 1);
  if (hasWord(cardIds[clampedIndex]!)) {
    if (clampedIndex === currentIndex) return session;
    return { ...session, currentIndex: clampedIndex, isFlipped: false };
  }

  for (let i = clampedIndex + 1; i < cardIds.length; i++) {
    if (hasWord(cardIds[i]!)) {
      return { ...session, currentIndex: i, isFlipped: false };
    }
  }

  return null;
}
