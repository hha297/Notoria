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
  expect(used).toBe(
    Math.min(available, MATCH_PAIR_MAX_ROUNDS * MATCH_PAIR_MAX_PAIRS_PER_ROUND),
  );
  expect(sizes.every((size) => size > 0)).toBe(true);
  expect(sizes.every((size) => size <= MATCH_PAIR_MAX_PAIRS_PER_ROUND)).toBe(
    true,
  );

  if (sizes.length > 1) {
    const min = Math.min(...sizes);
    // Leftover rounds may sit at the min while prior rounds stay near max.
    expect(min).toBeGreaterThanOrEqual(
      Math.min(MATCH_PAIR_MIN_PAIRS_PER_ROUND, Math.floor(available / sizes.length)),
    );
  }
}

describe("planMatchPairRoundSizes", () => {
  it("returns nothing for an empty bank", () => {
    expect(planMatchPairRoundSizes(0)).toEqual([]);
  });

  it("keeps a small bank in a single round even below the min", () => {
    expect(planMatchPairRoundSizes(1)).toEqual([1]);
    expect(planMatchPairRoundSizes(4)).toEqual([4]);
  });

  it("keeps up to 10 pairs as one round", () => {
    expect(planMatchPairRoundSizes(5)).toEqual([5]);
    expect(planMatchPairRoundSizes(8)).toEqual([8]);
    expect(planMatchPairRoundSizes(10)).toEqual([10]);
  });

  it("splits 20 pairs into two rounds of 10", () => {
    expect(planMatchPairRoundSizes(20)).toEqual([10, 10]);
  });

  it("rebalances tiny leftovers up toward the min when possible", () => {
    expect(planMatchPairRoundSizes(11)).toEqual([6, 5]);
    expect(planMatchPairRoundSizes(15)).toEqual([10, 5]);
  });

  it("caps usable pairs at max rounds × max pairs", () => {
    const sizes = planMatchPairRoundSizes(200);
    expect(sizes).toHaveLength(MATCH_PAIR_MAX_ROUNDS);
    expect(sizes.every((size) => size === MATCH_PAIR_MAX_PAIRS_PER_ROUND)).toBe(
      true,
    );
  });

  it("never pads with empty slots", () => {
    for (const count of [2, 7, 13, 20, 23, 37, 48, 51, 99]) {
      assertValidPlan(count, planMatchPairRoundSizes(count));
    }
  });
});

describe("progressionEventAfterPairMatch", () => {
  it("does not advance until the whole round is matched", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 1,
        roundPairCount: 10,
        currentRoundIndex: 0,
        totalRounds: 2,
      }),
    ).toBe("stay");
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 9,
        roundPairCount: 10,
        currentRoundIndex: 0,
        totalRounds: 2,
      }),
    ).toBe("stay");
  });

  it("signals round-complete so the UI can show Continue", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 10,
        roundPairCount: 10,
        currentRoundIndex: 0,
        totalRounds: 2,
      }),
    ).toBe("round-complete");
  });

  it("signals session-complete after the last round", () => {
    expect(
      progressionEventAfterPairMatch({
        matchedCount: 10,
        roundPairCount: 10,
        currentRoundIndex: 1,
        totalRounds: 2,
      }),
    ).toBe("session-complete");
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
    const rounds = buildMatchPairRounds(items(20));
    const ids = rounds.flat().map((item) => item.wordId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(20);
  });

  it("puts 10 pairs in a single round when the bank is 10", () => {
    const rounds = buildMatchPairRounds(items(10));
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toHaveLength(10);
  });

  it("splits sampled items with the planned sizes", () => {
    const bank = items(12);
    const sizes = planMatchPairRoundSizes(bank.length);
    const rounds = splitItemsIntoRoundSizes(bank, sizes);
    expect(rounds.map((round) => round.length)).toEqual(sizes);
    expect(rounds.flat()).toEqual(bank);
  });
});
