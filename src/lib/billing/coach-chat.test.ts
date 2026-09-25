import { describe, expect, it } from "vitest";
import {
  buildCoachSuggestedPrompts,
  buildLearningCoachContext,
  validateCoachChatActions,
} from "@/lib/billing/coach-chat";
import {
  emptyVocabularySummary,
  emptyWeekActivity,
  type CoachSnapshot,
} from "@/lib/billing/coach-model";
import {
  FREE_DAILY_QUOTAS,
  PREMIUM_COACH_CHAT_DAILY,
  featureEnabled,
  getFeatureAccess,
} from "@/lib/billing/plans";
import { getPlanComparisonRows } from "@/lib/billing/plan-features";

function baseSnapshot(overrides: Partial<CoachSnapshot> = {}): CoachSnapshot {
  return {
    language: "Finnish",
    vocabulary: emptyVocabularySummary(),
    vocabularyTotal: 0,
    dueCards: 0,
    weakWords: [],
    weakItems: [],
    speakingLevel: null,
    last7Days: emptyWeekActivity(),
    previous7Days: emptyWeekActivity(),
    rangeStartUtc: "2026-09-17T00:00:00.000Z",
    rangeEndUtc: "2026-09-24T00:00:00.000Z",
    recommendations: [],
    practicePlan: [],
    trends: [],
    trendsAvailable: false,
    path: [],
    crossModule: [],
    empty: true,
    ...overrides,
  };
}

describe("ai_learning_coach_chat entitlement", () => {
  it("blocks Free and Pro with a zero quota; Premium gets the daily budget", () => {
    expect(featureEnabled("free", "ai_learning_coach")).toBe(false);
    expect(featureEnabled("pro", "ai_learning_coach")).toBe(false);
    expect(featureEnabled("premium", "ai_learning_coach")).toBe(true);

    expect(getFeatureAccess("free", "ai_learning_coach_chat")).toEqual({
      kind: "quota",
      limit: 0,
    });
    expect(getFeatureAccess("pro", "ai_learning_coach_chat")).toEqual({
      kind: "quota",
      limit: 0,
    });
    expect(getFeatureAccess("premium", "ai_learning_coach_chat")).toEqual({
      kind: "quota",
      limit: PREMIUM_COACH_CHAT_DAILY,
    });
    expect(FREE_DAILY_QUOTAS.ai_learning_coach_chat).toBe(0);
  });
});

describe("coach chat context and actions", () => {
  it("builds a compact context without inventing fields", () => {
    const snapshot = baseSnapshot({
      empty: false,
      vocabularyTotal: 40,
      vocabulary: { MASTERED: 10, REVIEW: 12, LEARNING: 8, NEW: 10 },
      dueCards: 11,
      weakWords: ["elämä", "ahdas", "puhelias"],
      weakItems: [
        { word: "elämä", rating: "AGAIN" },
        { word: "ahdas", rating: "HARD" },
      ],
      last7Days: {
        ...emptyWeekActivity(),
        flashcardReviews: 6,
        speakingSessions: 0,
      },
      recommendations: [
        {
          type: "flashcard_review",
          href: "/exercises/flashcard",
          reason: "due",
        },
      ],
    });

    const context = buildLearningCoachContext(snapshot);
    expect(context.workspace.language).toBe("Finnish");
    expect(context.vocabulary.due).toBe(11);
    expect(context.vocabulary.difficultWords).toEqual([
      { word: "elämä", recentDifficulty: "AGAIN" },
      { word: "ahdas", recentDifficulty: "HARD" },
    ]);
    expect(context.activity.last7Days.speakingSessions).toBe(0);
    expect(context.coachInsights.currentFocus).toBe("flashcard_review");
  });

  it("only allows allowlisted action types with fixed hrefs", () => {
    const actions = validateCoachChatActions([
      { type: "flashcard_review", label: "Review due words" },
      { type: "speaking", label: "Start speaking" },
      { type: "flashcard_review", label: "Duplicate" },
      { type: "weak_words", label: "Practice weak words" },
    ]);
    expect(actions).toEqual([
      {
        type: "flashcard_review",
        label: "Review due words",
        href: "/exercises/flashcard",
      },
      {
        type: "speaking",
        label: "Start speaking",
        href: "/speaking",
      },
      {
        type: "weak_words",
        label: "Practice weak words",
        href: "/exercises/flashcard?focus=weak",
      },
    ]);
  });

  it("suggests data-backed prompts and starter prompts when empty", () => {
    const empty = buildCoachSuggestedPrompts(baseSnapshot({ empty: true }));
    expect(empty.map((p) => p.id)).toContain("getting_started");

    const rich = buildCoachSuggestedPrompts(
      baseSnapshot({
        empty: false,
        vocabularyTotal: 20,
        dueCards: 5,
        weakWords: ["sana"],
        weakItems: [{ word: "sana", rating: "AGAIN" }],
        last7Days: {
          ...emptyWeekActivity(),
          speakingSessions: 0,
          listeningLessons: 0,
        },
      }),
    );
    const ids = rich.map((p) => p.id);
    expect(ids).toContain("practice_today");
    expect(ids).toContain("struggling_words");
    expect(ids).toContain("improve_speaking");
    expect(ids).toContain("am_i_improving");
    expect(ids).not.toContain("getting_started");
  });
});

describe("plan comparison ask coach row", () => {
  it("advertises Ask your AI Learning Coach on Premium only", () => {
    const row = getPlanComparisonRows().find((r) => r.id === "ask_learning_coach");
    expect(row).toBeDefined();
    expect(row?.cells.free).toEqual({ kind: "unavailable" });
    expect(row?.cells.pro).toEqual({ kind: "unavailable" });
    expect(row?.cells.premium).toEqual({
      kind: "quota",
      limit: PREMIUM_COACH_CHAT_DAILY,
    });
  });
});
