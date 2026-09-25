import { describe, expect, it } from "vitest";
import {
  emptyVocabularySummary,
  emptyWeekActivity,
  type CoachSnapshot,
} from "@/lib/billing/coach-model";
import {
  buildAttentionItems,
  buildCoachNotices,
  buildProgressComparisons,
  buildWhyEvidence,
  computeLearningStreak,
  parseCoachProgressPeriod,
  progressAskQuestion,
  progressHistoryAvailable,
} from "@/lib/billing/coach-progress";

function baseSnapshot(overrides: Partial<CoachSnapshot> = {}): CoachSnapshot {
  return {
    language: "Finnish",
    vocabulary: { ...emptyVocabularySummary(), MASTERED: 12, LEARNING: 8 },
    vocabularyTotal: 40,
    dueCards: 11,
    weakWords: ["elämä", "ahdas", "puhelias"],
    weakItems: [
      { word: "elämä", rating: "AGAIN" },
      { word: "ahdas", rating: "HARD" },
    ],
    speakingLevel: null,
    last7Days: {
      ...emptyWeekActivity(),
      flashcardReviews: 6,
      againOrHard: 3,
      speakingSessions: 0,
    },
    previous7Days: emptyWeekActivity(),
    rangeStartUtc: "2026-09-17T00:00:00.000Z",
    rangeEndUtc: "2026-09-24T00:00:00.000Z",
    recommendations: [
      {
        type: "flashcard_review",
        href: "/exercises/flashcard",
        reason: "due",
      },
    ],
    practicePlan: [],
    trends: [],
    trendsAvailable: false,
    path: [],
    crossModule: [],
    empty: false,
    ...overrides,
  };
}

describe("coach progress builders", () => {
  it("parses period query params with a 30-day default", () => {
    expect(parseCoachProgressPeriod("7")).toBe(7);
    expect(parseCoachProgressPeriod("90")).toBe(90);
    expect(parseCoachProgressPeriod("nope")).toBe(30);
  });

  it("builds before→now comparisons only for modules with activity", () => {
    const previous = { ...emptyWeekActivity(), flashcardReviews: 4 };
    const current = {
      ...emptyWeekActivity(),
      flashcardReviews: 10,
      speakingSessions: 2,
    };
    const rows = buildProgressComparisons(previous, current);
    expect(rows).toEqual([
      {
        key: "flashcardReviews",
        previous: 4,
        current: 10,
        delta: 6,
      },
      {
        key: "speakingSessions",
        previous: 0,
        current: 2,
        delta: 2,
      },
    ]);
    expect(progressHistoryAvailable(previous, current)).toBe(true);
    expect(
      progressHistoryAvailable(emptyWeekActivity(), emptyWeekActivity()),
    ).toBe(false);
  });

  it("explains recommendations from observable facts", () => {
    const why = buildWhyEvidence(baseSnapshot());
    expect(why.some((code) => code.startsWith("due:"))).toBe(true);
    expect(why.some((code) => code.startsWith("weak:"))).toBe(true);
    expect(why).toContain("speaking_idle");
  });

  it("builds attention items that link to real routes", () => {
    const items = buildAttentionItems(baseSnapshot());
    expect(items[0]?.href).toBe("/exercises/flashcard");
    expect(items.some((item) => item.type === "speaking")).toBe(true);
  });

  it("emits deterministic notices without inventing causality", () => {
    const comparisons = buildProgressComparisons(
      { ...emptyWeekActivity(), flashcardReviews: 2, againOrHard: 5 },
      { ...emptyWeekActivity(), flashcardReviews: 8, againOrHard: 2 },
    );
    const notices = buildCoachNotices({
      comparisons,
      snapshot: baseSnapshot(),
    });
    expect(notices).toContain("reviews_up");
    expect(notices).toContain("misses_down");
    expect(notices).toContain("speaking_quiet");
    expect(progressAskQuestion(notices)).toMatch(/speaking/i);
  });

  it("computes Duolingo-style streaks with today grace", () => {
    const now = new Date("2026-09-24T15:00:00.000Z");
    const streak = computeLearningStreak(
      ["2026-09-22", "2026-09-23", "2026-09-20"],
      now,
    );
    expect(streak.practicedToday).toBe(false);
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
    expect(streak.recentDays).toHaveLength(7);
    expect(streak.recentDays.at(-1)?.key).toBe("2026-09-24");
    expect(streak.recentDays.at(-2)?.active).toBe(true);
  });

  it("counts today when practiced", () => {
    const now = new Date("2026-09-24T15:00:00.000Z");
    const streak = computeLearningStreak(
      ["2026-09-22", "2026-09-23", "2026-09-24"],
      now,
    );
    expect(streak.practicedToday).toBe(true);
    expect(streak.current).toBe(3);
    expect(streak.longest).toBe(3);
  });
});
