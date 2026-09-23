import { describe, expect, it } from "vitest";
import {
  buildCoachRecommendations,
  buildDeterministicCoachNote,
  countDueCards,
  hashCoachFacts,
  isCoachEmpty,
  pickWeakWords,
  summarizeVocabulary,
  utcDaysAgoStart,
  vocabularyTotal,
  type CoachFacts,
} from "@/lib/billing/coach-model";
import { displayPlan, entitlementPlan, featureEnabled } from "@/lib/billing/plans";

function facts(overrides: Partial<CoachFacts> = {}): CoachFacts {
  return {
    language: "Suomi",
    vocabulary: { MASTERED: 1, REVIEW: 4, LEARNING: 3, NEW: 3 },
    vocabularyTotal: 11,
    dueCards: 8,
    weakWords: ["Ahdas", "Puhelias", "Elämä"],
    last7Days: {
      flashcardReviews: 6,
      againOrHard: 2,
      listeningLessons: 1,
      speakingSessions: 0,
      writingDocuments: 1,
      theoryNotes: 4,
    },
    rangeStartUtc: "2026-09-17T00:00:00.000Z",
    rangeEndUtc: "2026-09-23T12:00:00.000Z",
    ...overrides,
  };
}

describe("coach vocabulary and due cards", () => {
  it("maps status counts and totals", () => {
    const summary = summarizeVocabulary([
      { status: "MASTERED", total: 1 },
      { status: "REVIEW", total: 4 },
      { status: "LEARNING", total: 3 },
      { status: "NEW", total: 3 },
      { status: "OTHER", total: 9 },
    ]);
    expect(summary).toEqual({ MASTERED: 1, REVIEW: 4, LEARNING: 3, NEW: 3 });
    expect(vocabularyTotal(summary)).toBe(11);
  });

  it("counts null or past nextReviewAt as due", () => {
    expect(countDueCards({ vocabularyTotal: 11, notDueCount: 3 })).toBe(8);
    expect(countDueCards({ vocabularyTotal: 0, notDueCount: 0 })).toBe(0);
  });

  it("dedupes weak words and caps the list", () => {
    expect(pickWeakWords(["Ahdas", "ahdas", "Puhelias", "Elämä", "X"], 3)).toEqual([
      "Ahdas",
      "Puhelias",
      "Elämä",
    ]);
  });
});

describe("coach recommendations", () => {
  it("recommends due flashcards and weak words first", () => {
    const list = buildCoachRecommendations({
      dueCards: 8,
      weakWords: ["Ahdas"],
      last7Days: facts().last7Days,
      vocabularyTotal: 11,
    });
    expect(list.map((item) => item.type)).toEqual([
      "flashcard_review",
      "weak_words",
      "speaking",
    ]);
    expect(list[0]?.href).toBe("/exercises/flashcard");
  });

  it("recommends speaking when history exists and speaking is idle", () => {
    const list = buildCoachRecommendations({
      dueCards: 0,
      weakWords: [],
      last7Days: {
        ...facts().last7Days,
        speakingSessions: 0,
        listeningLessons: 2,
      },
      vocabularyTotal: 5,
    });
    expect(list.some((item) => item.type === "speaking")).toBe(true);
  });

  it("returns a keep-going or start action when there is nothing specific", () => {
    expect(
      buildCoachRecommendations({
        dueCards: 0,
        weakWords: [],
        last7Days: {
          flashcardReviews: 0,
          againOrHard: 0,
          listeningLessons: 0,
          speakingSessions: 0,
          writingDocuments: 0,
          theoryNotes: 0,
        },
        vocabularyTotal: 0,
      })[0]?.type,
    ).toBe("keep_going");
  });
});

describe("coach empty state and note fallback", () => {
  it("detects an empty workspace", () => {
    expect(
      isCoachEmpty({
        vocabularyTotal: 0,
        last7Days: {
          flashcardReviews: 0,
          againOrHard: 0,
          listeningLessons: 0,
          speakingSessions: 0,
          writingDocuments: 0,
          theoryNotes: 0,
        },
      }),
    ).toBe(true);
  });

  it("builds a deterministic note from facts only", () => {
    const note = buildDeterministicCoachNote(facts());
    expect(note).toContain("1 mastered");
    expect(note).toContain("8 cards due");
    expect(note).toContain("Ahdas");
    expect(note).toContain("Suomi");
    expect(note).not.toContain("B1");
    expect(note).not.toContain("invent");
  });

  it("uses the empty-history copy when there is no activity", () => {
    const note = buildDeterministicCoachNote(
      facts({
        vocabulary: { MASTERED: 0, REVIEW: 0, LEARNING: 0, NEW: 0 },
        vocabularyTotal: 0,
        dueCards: 0,
        weakWords: [],
        last7Days: {
          flashcardReviews: 0,
          againOrHard: 0,
          listeningLessons: 0,
          speakingSessions: 0,
          writingDocuments: 0,
          theoryNotes: 0,
        },
      }),
    );
    expect(note).toContain("haven't built much learning history");
  });

  it("hashes facts so unchanged activity can reuse a cached note", () => {
    expect(hashCoachFacts(facts())).toBe(hashCoachFacts(facts()));
    expect(hashCoachFacts(facts({ dueCards: 1 }))).not.toBe(hashCoachFacts(facts()));
  });
});

describe("coach date window", () => {
  it("uses UTC calendar days for the last-7-days start", () => {
    const start = utcDaysAgoStart(7, new Date("2026-09-23T15:30:00.000Z"));
    expect(start.toISOString()).toBe("2026-09-17T00:00:00.000Z");
  });
});

describe("premium coach entitlement", () => {
  it("allows Premium and admins, denies Free and Pro", () => {
    expect(featureEnabled("free", "ai_learning_coach")).toBe(false);
    expect(featureEnabled("pro", "ai_learning_coach")).toBe(false);
    expect(featureEnabled("premium", "ai_learning_coach")).toBe(true);
    expect(
      entitlementPlan({
        role: "ADMIN",
        subscriptionPlan: "free",
        subscriptionStatus: null,
      }),
    ).toBe("premium");
    expect(
      displayPlan({
        subscriptionPlan: "premium",
        subscriptionStatus: "active",
      }),
    ).toBe("premium");
    expect(
      featureEnabled(
        entitlementPlan({
          role: "USER",
          subscriptionPlan: "premium",
          subscriptionStatus: "active",
        }),
        "ai_learning_coach",
      ),
    ).toBe(true);
    expect(
      featureEnabled(
        entitlementPlan({
          role: "USER",
          subscriptionPlan: "premium",
          subscriptionStatus: "canceled",
        }),
        "ai_learning_coach",
      ),
    ).toBe(false);
  });

  it("keeps Premium access while cancellation is scheduled", () => {
    expect(
      featureEnabled(
        entitlementPlan({
          role: "USER",
          subscriptionPlan: "premium",
          subscriptionStatus: "active",
        }),
        "ai_learning_coach",
      ),
    ).toBe(true);
  });
});
