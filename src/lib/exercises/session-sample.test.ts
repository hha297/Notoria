import { describe, expect, it } from "vitest";
import {
  preferencesFromOutcomes,
  upsertSectionOutcome,
} from "@/lib/exercises/recent-outcomes";
import {
  sampleItemsWithPreferences,
  sampleSessionItems,
} from "@/lib/exercises/session-size";

type WordItem = {
  id: string;
  wordId: string;
  createdAt: string;
  sentence?: string;
};

function item(
  wordId: string,
  createdAt: string,
  sentence = `${wordId}-sentence`,
): WordItem {
  return {
    id: `${wordId}-${sentence}`,
    wordId,
    createdAt,
    sentence,
  };
}

describe("preferencesFromOutcomes", () => {
  it("soft-avoids correct words and soft-prefers incorrect ones", () => {
    expect(
      preferencesFromOutcomes([
        { wordId: "a", correct: true, itemKey: "sent-a" },
        { wordId: "b", correct: false },
        { wordId: "c", correct: true },
      ]),
    ).toEqual({
      softAvoidWordIds: ["a", "c"],
      softPreferWordIds: ["b"],
      softAvoidItemKeys: ["sent-a"],
    });
  });

  it("upserts the latest outcome per word", () => {
    const first = upsertSectionOutcome([], {
      wordId: "a",
      correct: false,
    });
    const second = upsertSectionOutcome(first, {
      wordId: "a",
      correct: true,
      itemKey: "final",
    });
    expect(preferencesFromOutcomes(second)).toEqual({
      softAvoidWordIds: ["a"],
      softPreferWordIds: [],
      softAvoidItemKeys: ["final"],
    });
  });
});

describe("sampleItemsWithPreferences", () => {
  const newest = Array.from({ length: 20 }, (_, index) =>
    item(
      `new-${index}`,
      `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    ),
  );
  const older = Array.from({ length: 40 }, (_, index) =>
    item(
      `old-${index}`,
      `2024-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    ),
  );
  const pool = [...newest, ...older];

  it("prefers newest words for most of the section", () => {
    const newestIds = new Set(newest.map((row) => row.wordId));
    let newestHits = 0;
    const runs = 50;

    for (let run = 0; run < runs; run += 1) {
      const sampled = sampleItemsWithPreferences(pool, 10, {
        getWordId: (row) => row.wordId,
        getCreatedAt: (row) => row.createdAt,
      });
      expect(sampled).toHaveLength(10);
      newestHits += sampled.filter((row) => newestIds.has(row.wordId)).length;
    }

    // Target ~80%; allow statistical slack across randomized runs.
    expect(newestHits / (runs * 10)).toBeGreaterThan(0.7);
  });

  it("soft-avoids recently correct words when alternatives exist", () => {
    const avoid = newest.slice(0, 12).map((row) => row.wordId);
    const sampled = sampleItemsWithPreferences(pool, 10, {
      getWordId: (row) => row.wordId,
      getCreatedAt: (row) => row.createdAt,
      softAvoidWordIds: avoid,
    });

    const avoidedCount = sampled.filter((row) =>
      avoid.includes(row.wordId),
    ).length;
    expect(avoidedCount).toBeLessThanOrEqual(3);
  });

  it("still returns a full section when every word was recently correct", () => {
    const allIds = pool.map((row) => row.wordId);
    const sampled = sampleItemsWithPreferences(pool, 10, {
      getWordId: (row) => row.wordId,
      getCreatedAt: (row) => row.createdAt,
      softAvoidWordIds: allIds,
    });
    expect(sampled).toHaveLength(10);
  });

  it("prefers incorrect words and different sentences when available", () => {
    const variants = [
      item("focus", "2026-04-01T00:00:00.000Z", "sentence-one"),
      item("focus", "2026-04-01T00:00:00.000Z", "sentence-two"),
      item("other", "2026-04-02T00:00:00.000Z", "other-one"),
    ];

    const sampled = sampleItemsWithPreferences(variants, 1, {
      getWordId: (row) => row.wordId,
      getCreatedAt: (row) => row.createdAt,
      getItemKey: (row) => row.sentence ?? row.id,
      softPreferWordIds: ["focus"],
      softAvoidItemKeys: ["sentence-one"],
    });

    expect(sampled).toHaveLength(1);
    expect(sampled[0]?.wordId).toBe("focus");
    expect(sampled[0]?.sentence).toBe("sentence-two");
  });

  it("keeps sampleSessionItems backward compatible without preferences", () => {
    expect(sampleSessionItems([1, 2, 3], "form_sentence")).toHaveLength(3);
  });
});
