import type { FlashcardWord } from "@/types/flashcards";
import {
  sampleItemsWithPreferences,
  type SessionSamplePreferences,
} from "@/lib/exercises/session-size";
import {
  assignWordMeanings,
  filterConflictFreeAssignments,
  shuffleArray,
} from "@/lib/exercises/utils";

export type MatchPairItem = {
  wordId: string;
  word: string;
  meaning: string;
};

/** One progression = one complete match-pair round, not one pair. */
export const MATCH_PAIR_MAX_ROUNDS = 10;
export const MATCH_PAIR_MIN_PAIRS_PER_ROUND = 5;
export const MATCH_PAIR_MAX_PAIRS_PER_ROUND = 10;

export function buildMatchPairItems(words: FlashcardWord[]): MatchPairItem[] {
  const assignments = assignWordMeanings(words);
  const conflictFree = filterConflictFreeAssignments(words, assignments);

  return conflictFree.map((word) => ({
    wordId: word.id,
    word: word.word,
    meaning: assignments.get(word.id)!,
  }));
}

/**
 * Split available vocabulary into round sizes.
 * At most 10 rounds, each 5–10 pairs when possible. Never pads with
 * duplicates or empty slots. A round may have fewer than 5 pairs only
 * when the whole bank is smaller than 5.
 */
export function planMatchPairRoundSizes(availableCount: number): number[] {
  if (availableCount <= 0) return [];

  if (availableCount <= MATCH_PAIR_MAX_PAIRS_PER_ROUND) {
    return [availableCount];
  }

  const usable = Math.min(
    availableCount,
    MATCH_PAIR_MAX_ROUNDS * MATCH_PAIR_MAX_PAIRS_PER_ROUND,
  );
  const minRounds = Math.ceil(usable / MATCH_PAIR_MAX_PAIRS_PER_ROUND);
  const maxRounds = Math.min(
    MATCH_PAIR_MAX_ROUNDS,
    Math.floor(usable / MATCH_PAIR_MIN_PAIRS_PER_ROUND),
  );
  const roundCount = Math.max(minRounds, maxRounds);

  const base = Math.floor(usable / roundCount);
  const remainder = usable % roundCount;
  return Array.from(
    { length: roundCount },
    (_, index) => base + (index < remainder ? 1 : 0),
  );
}

export type MatchPairProgressionEvent = "stay" | "next-round" | "complete";

/** Pair matches never advance progression; only a finished round does. */
export function progressionEventAfterPairMatch(input: {
  matchedCount: number;
  roundPairCount: number;
  currentRoundIndex: number;
  totalRounds: number;
}): MatchPairProgressionEvent {
  if (input.roundPairCount <= 0 || input.matchedCount < input.roundPairCount) {
    return "stay";
  }
  if (input.currentRoundIndex >= input.totalRounds - 1) {
    return "complete";
  }
  return "next-round";
}

export function splitItemsIntoRoundSizes<T>(
  items: T[],
  sizes: number[],
): T[][] {
  const rounds: T[][] = [];
  let offset = 0;
  for (const size of sizes) {
    if (size <= 0) continue;
    const slice = items.slice(offset, offset + size);
    if (slice.length === 0) break;
    rounds.push(slice);
    offset += size;
  }
  return rounds;
}

export function buildMatchPairRounds(
  items: MatchPairItem[],
  preferences?: SessionSamplePreferences<MatchPairItem>,
): MatchPairItem[][] {
  const sizes = planMatchPairRoundSizes(items.length);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total === 0) return [];

  const sampled = preferences
    ? sampleItemsWithPreferences(items, total, preferences)
    : shuffleArray(items).slice(0, total);

  return splitItemsIntoRoundSizes(sampled, sizes);
}
