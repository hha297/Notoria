import { describe, expect, it } from "vitest";
import {
  commitPracticeSession,
  emptyPracticeHistory,
  isRecentlyAdded,
  practiceSelectionWeight,
  recordPracticeAttempt,
  weightedSampleUnique,
} from "@/lib/exercises/practice-history";
import { sampleItemsLearningAware } from "@/lib/exercises/session-size";

describe("practiceSelectionWeight", () => {
  const now = Date.UTC(2026, 0, 15);

  it("boosts never-tested words", () => {
    expect(practiceSelectionWeight(undefined, { now })).toBeGreaterThan(
      practiceSelectionWeight(
        {
          attempts: 5,
          correct: 5,
          incorrect: 0,
          correctStreak: 5,
          lastSeenAt: now - 60_000,
        },
        { now },
      ),
    );
  });

  it("penalizes words from the last session hard", () => {
    const stats = {
      attempts: 1,
      correct: 0,
      incorrect: 1,
      correctStreak: 0,
      lastSeenAt: now - 3_600_000,
      lastIncorrectAt: now - 3_600_000,
    };
    const base = practiceSelectionWeight(stats, { now });
    const penalized = practiceSelectionWeight(stats, {
      now,
      inLastSession: true,
    });
    expect(penalized).toBeLessThan(base * 0.2);
  });

  it("reduces weight as correct streak grows", () => {
    const low = practiceSelectionWeight(
      {
        attempts: 2,
        correct: 2,
        incorrect: 0,
        correctStreak: 2,
        lastSeenAt: now - 86_400_000,
        lastCorrectAt: now - 86_400_000,
      },
      { now },
    );
    const high = practiceSelectionWeight(
      {
        attempts: 8,
        correct: 8,
        incorrect: 0,
        correctStreak: 8,
        lastSeenAt: now - 86_400_000,
        lastCorrectAt: now - 86_400_000,
      },
      { now },
    );
    expect(high).toBeLessThan(low);
  });
});

describe("weightedSampleUnique + learning-aware session", () => {
  it("never returns duplicates by identity", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `w${i}` }));
    const picked = weightedSampleUnique(items, 10, () => 1, () => 0.5);
    expect(new Set(picked.map((item) => item.id)).size).toBe(picked.length);
  });

  it("mixed history prefers unseen/misses over mastered (Scenario A)", () => {
    const now = Date.UTC(2026, 0, 15);
    const words = Array.from({ length: 100 }, (_, i) => ({
      wordId: `w${i}`,
      createdAt: Date.UTC(2025, 6, 1) + i * 86_400_000,
    }));

    let history = emptyPracticeHistory();
    // 0–29 never tested
    // 30–49 incorrect
    for (let i = 30; i < 50; i++) {
      history = recordPracticeAttempt(
        history,
        `w${i}`,
        false,
        now - 3 * 3_600_000,
      );
    }
    // 50–99 correctly answered (streak)
    for (let i = 50; i < 100; i++) {
      history = recordPracticeAttempt(history, `w${i}`, true, now - 86_400_000);
      history = recordPracticeAttempt(history, `w${i}`, true, now - 80_000_000);
    }

    let masteredPicks = 0;
    let unseenOrMissPicks = 0;
    for (let trial = 0; trial < 8; trial++) {
      const picked = sampleItemsLearningAware(words, 20, {
        getWordId: (item) => item.wordId,
        getCreatedAt: (item) => item.createdAt,
        history,
        now,
        random: Math.random,
      });
      for (const item of picked) {
        const index = Number(item.wordId.slice(1));
        if (index >= 50) masteredPicks += 1;
        else unseenOrMissPicks += 1;
      }
    }
    // Across 8×20 draws, learning-aware should not be dominated by mastered.
    expect(unseenOrMissPicks).toBeGreaterThan(masteredPicks);
  });

  it("Try Again strongly avoids the prior session's correct-heavy set", () => {
    const words = Array.from({ length: 100 }, (_, i) => ({
      wordId: `w${i}`,
      createdAt: Date.UTC(2026, 0, 1) + i * 1000,
    }));

    let history = emptyPracticeHistory();
    const firstSessionIds = words.slice(0, 20).map((w) => w.wordId);
    for (const id of firstSessionIds) {
      history = recordPracticeAttempt(history, id, true, Date.UTC(2026, 0, 10));
    }
    history = commitPracticeSession(history, firstSessionIds);

    const next = sampleItemsLearningAware(words, 20, {
      getWordId: (item) => item.wordId,
      getCreatedAt: (item) => item.createdAt,
      history,
      now: Date.UTC(2026, 0, 10, 1),
      // Deterministic-ish: still uses weights; use Math.random for variety check
      random: Math.random,
    });

    const overlap = next.filter((item) =>
      firstSessionIds.includes(item.wordId),
    ).length;
    // Should be well below the old ~80–90% repeat rate
    expect(overlap).toBeLessThan(10);
  });
});

describe("sortWordsByPractice", () => {
  it("newest / least practiced order correctly", async () => {
    const { sortWordsByPractice } = await import(
      "@/lib/exercises/practice-history"
    );
    const now = Date.UTC(2026, 0, 10);
    let history = emptyPracticeHistory();
    history = recordPracticeAttempt(history, "old", true, now - 10_000);
    const words = [
      { id: "new", createdAt: now },
      { id: "old", createdAt: now - 86_400_000 },
      { id: "mid", createdAt: now - 3_600_000 },
    ];
    const newest = sortWordsByPractice(
      words,
      "newest",
      (w) => w.id,
      (w) => w.createdAt,
      history,
    ).map((w) => w.id);
    expect(newest[0]).toBe("new");

    const least = sortWordsByPractice(
      words,
      "least_practiced",
      (w) => w.id,
      (w) => w.createdAt,
      history,
    ).map((w) => w.id);
    expect(least[0]).not.toBe("old");
    expect(least.indexOf("old")).toBe(least.length - 1);
  });
});

describe("isRecentlyAdded", () => {
  it("includes only creations within 48h", () => {
    const now = Date.UTC(2026, 0, 10);
    expect(isRecentlyAdded(now - 47 * 3600_000, now)).toBe(true);
    expect(isRecentlyAdded(now - 49 * 3600_000, now)).toBe(false);
  });
});

describe("recordPracticeAttempt", () => {
  it("clears streak after a miss and restores after a hit", () => {
    let history = emptyPracticeHistory();
    history = recordPracticeAttempt(history, "a", true);
    history = recordPracticeAttempt(history, "a", true);
    expect(history.words.a?.correctStreak).toBe(2);
    history = recordPracticeAttempt(history, "a", false);
    expect(history.words.a?.correctStreak).toBe(0);
    history = recordPracticeAttempt(history, "a", true);
    expect(history.words.a?.correctStreak).toBe(1);
  });
});
