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

/**
 * One progression = one complete match-pair round, not one pair.
 * Prefer fuller rounds (up to 10); leftover rounds stay ≥ min when possible.
 */
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
 * Split available vocabulary into round sizes of about 4–5 pairs.
 * Never pads with duplicates. A round may be smaller than the min only
 * when the bank cannot support evenly-sized rounds.
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

  const sizes: number[] = [];
  let remaining = usable;
  while (remaining > 0 && sizes.length < MATCH_PAIR_MAX_ROUNDS) {
    if (remaining <= MATCH_PAIR_MAX_PAIRS_PER_ROUND) {
      sizes.push(remaining);
      break;
    }
    sizes.push(MATCH_PAIR_MAX_PAIRS_PER_ROUND);
    remaining -= MATCH_PAIR_MAX_PAIRS_PER_ROUND;
  }

  return rebalanceMatchPairRoundSizes(sizes);
}

/** Steal from larger rounds until tiny leftovers are as even as possible. */
function rebalanceMatchPairRoundSizes(sizes: number[]): number[] {
  if (sizes.length <= 1) return sizes;
  const next = [...sizes];
  for (let guard = 0; guard < 40; guard += 1) {
    let smallIdx = -1;
    let smallVal = Number.POSITIVE_INFINITY;
    let largeIdx = -1;
    let largeVal = -1;
    for (let i = 0; i < next.length; i += 1) {
      const value = next[i]!;
      if (value < smallVal) {
        smallVal = value;
        smallIdx = i;
      }
      if (value > largeVal) {
        largeVal = value;
        largeIdx = i;
      }
    }
    if (smallIdx < 0 || largeIdx < 0 || smallIdx === largeIdx) break;
    if (smallVal >= MATCH_PAIR_MIN_PAIRS_PER_ROUND) break;
    if (largeVal <= smallVal + 1) break;
    next[largeIdx]! -= 1;
    next[smallIdx]! += 1;
  }
  return next;
}

/**
 * After the last pair in a round: wait for Continue (or View results).
 * Pair matches alone never auto-advance.
 */
export type MatchPairProgressionEvent =
  | "stay"
  | "round-complete"
  | "session-complete";

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
    return "session-complete";
  }
  return "round-complete";
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
