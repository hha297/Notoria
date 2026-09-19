import { describe, expect, it } from "vitest";
import {
  MATCH_PAIR_MAX_PAIRS_PER_ROUND,
  MATCH_PAIR_MAX_ROUNDS,
  MATCH_PAIR_MIN_PAIRS_PER_ROUND,
  buildMatchPairRounds,
  planMatchPairRoundSizes,
  progressionEventAfterPairMatch,
  splitItemsIntoRoundSizes,
  type MatchPairItem,
} from "@/lib/exercises/match-pairs";

function assertValidPlan(available: number, sizes: number[]) {
  const used = sizes.reduce((sum, size) => sum + size, 0);
  expect(sizes.length).toBeLessThanOrEqual(MATCH_PAIR_MAX_ROUNDS);
  expect(used).toBe(Math.min(available, MATCH_PAIR_MAX_ROUNDS * MATCH_PAIR_MAX_PAIRS_PER_ROUND));
  expect(sizes.every((size) => size > 0)).toBe(true);
  expect(sizes.every((size) => size <= MATCH_PAIR_MAX_PAIRS_PER_ROUND)).toBe(true);

  if (available >= MATCH_PAIR_MIN_PAIRS_PER_ROUND) {
    expect(sizes.every((size) => size >= MATCH_PAIR_MIN_PAIRS_PER_ROUND)).toBe(
      true,
    );
  }

  if (sizes.length > 1) {
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    expect(max - min).toBeLessThanOrEqual(1);
  }
}

describe("planMatchPairRoundSizes", () => {
  it("returns nothing for an empty bank", () => {
    expect(planMatchPairRoundSizes(0)).toEqual([]);
  });

  it("keeps a small bank in a single round even below 5 pairs", () => {
    expect(planMatchPairRoundSizes(1)).toEqual([1]);
    expect(planMatchPairRoundSizes(4)).toEqual([4]);
  });

  it("keeps 5–10 pairs as one round", () => {
    expect(planMatchPairRoundSizes(5)).toEqual([5]);
    expect(planMatchPairRoundSizes(8)).toEqual([8]);
    expect(planMatchPairRoundSizes(10)).toEqual([10]);
  });

  it("splits 11–12 pairs into two valid rounds instead of a tiny leftover", () => {
    assertValidPlan(11, planMatchPairRoundSizes(11));
    expect(planMatchPairRoundSizes(11)).toHaveLength(2);
    assertValidPlan(12, planMatchPairRoundSizes(12));
    expect(planMatchPairRoundSizes(12)).toEqual([6, 6]);
  });

  it("uses 10 rounds of 8 for 80 pairs", () => {
    const sizes = planMatchPairRoundSizes(80);
    expect(sizes).toHaveLength(10);
    expect(sizes.every((size) => size === 8)).toBe(true);
  });

  it("uses 10 rounds of 5 for 50 pairs", () => {
    const sizes = planMatchPairRoundSizes(50);
    expect(sizes).toHaveLength(10);
    expect(sizes.every((size) => size === 5)).toBe(true);
  });

  it("does not invent extra rounds when 37 pairs cannot fill 10×5", () => {
    const sizes = planMatchPairRoundSizes(37);
    assertValidPlan(37, sizes);
    expect(sizes.length).toBeLessThan(10);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(37);
  });

  it("caps at 10 rounds of 10 and does not consume surplus vocabulary", () => {
    const sizes = planMatchPairRoundSizes(200);
    expect(sizes).toHaveLength(10);
    expect(sizes.every((size) => size === 10)).toBe(true);
  });

  it("never pads to 10 rounds with empty or duplicate slots", () => {
    for (const count of [2, 7, 13, 23, 37, 48, 49, 51, 99, 100]) {
      assertValidPlan(count, planMatchPairRoundSizes(count));
    }
  });
});

describe("progressionEventAfterPairMatch", () => {
  it("does not advance progression until the whole round is matched", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 1,
        roundPairCount: 8,
        currentRoundIndex: 0,
        totalRounds: 10,
      }),
    ).toBe("stay");
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 4,
        roundPairCount: 8,
        currentRoundIndex: 0,
        totalRounds: 10,
      }),
    ).toBe("stay");
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 7,
        roundPairCount: 8,
        currentRoundIndex: 0,
        totalRounds: 10,
      }),
    ).toBe("stay");
  });

  it("advances exactly one round when the final pair is matched", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 8,
        roundPairCount: 8,
        currentRoundIndex: 0,
        totalRounds: 10,
      }),
    ).toBe("next-round");
  });

  it("completes the session after the last round instead of adding another", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 6,
        roundPairCount: 6,
        currentRoundIndex: 5,
        totalRounds: 6,
      }),
    ).toBe("complete");
  });
});

describe("buildMatchPairRounds", () => {
  function items(count: number): MatchPairItem[] {
    return Array.from({ length: count }, (_, index) => ({
      wordId: `w${index}`,
      word: `word-${index}`,
      meaning: `meaning-${index}`,
    }));
  }

  it("does not duplicate vocabulary across rounds", () => {
    const rounds = buildMatchPairRounds(items(37));
    const ids = rounds.flat().map((item) => item.wordId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(37);
  });

  it("splits sampled items with the planned sizes", () => {
    const bank = items(12);
    const sizes = planMatchPairRoundSizes(bank.length);
    const rounds = splitItemsIntoRoundSizes(bank, sizes);
    expect(rounds.map((round) => round.length)).toEqual(sizes);
    expect(rounds.flat()).toEqual(bank);
  });
});
