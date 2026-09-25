import { createHash } from "node:crypto";
import type { PlanId } from "@/lib/billing/plans";

export const VOCAB_STATUSES = ["MASTERED", "REVIEW", "LEARNING", "NEW"] as const;
export type VocabStatus = (typeof VOCAB_STATUSES)[number];

export type CoachRecommendationType =
  | "flashcard_review"
  | "weak_words"
  | "speaking"
  | "listening"
  | "writing"
  | "theory"
  | "keep_going";

export type CoachRecommendation = {
  type: CoachRecommendationType;
  href: string;
  /** Machine reason for tests and future adaptive practice. */
  reason: string;
};

export type CoachVocabularySummary = Record<VocabStatus, number>;

export type CoachWeekActivity = {
  flashcardReviews: number;
  againOrHard: number;
  listeningLessons: number;
  speakingSessions: number;
  writingDocuments: number;
  theoryNotes: number;
};

export type WeakWordRating = "AGAIN" | "HARD";

export type WeakWordItem = {
  word: string;
  rating: WeakWordRating;
};

export type CoachPracticeStep = {
  type: CoachRecommendationType;
  href: string;
  estimatedMinutes: number;
  /** Short machine detail for UI (counts, word lists). */
  detail: string;
};

export type CoachTrend = {
  key: keyof CoachWeekActivity;
  previous: number;
  current: number;
};

export type CoachCrossModuleHint = {
  type: "theory_to_practice" | "vocab_to_speaking";
  href: string;
  reason: string;
};

export type CoachFacts = {
  /** Display name of the workspace study language (e.g. Finnish), not the ISO code. */
  language: string;
  vocabulary: CoachVocabularySummary;
  vocabularyTotal: number;
  dueCards: number;
  weakWords: string[];
  weakItems: WeakWordItem[];
  /** Latest speaking session CEFR when the system stored one. */
  speakingLevel: string | null;
  last7Days: CoachWeekActivity;
  previous7Days: CoachWeekActivity;
  rangeStartUtc: string;
  rangeEndUtc: string;
};

export type CoachSnapshot = CoachFacts & {
  recommendations: CoachRecommendation[];
  practicePlan: CoachPracticeStep[];
  trends: CoachTrend[];
  trendsAvailable: boolean;
  path: CoachRecommendation[];
  crossModule: CoachCrossModuleHint[];
  empty: boolean;
};

export type CoachResult =
  | {
      ok: true;
      snapshot: CoachSnapshot;
      note: string;
      noteSource: "ai" | "deterministic";
    }
  | {
      ok: false;
      code: "PREMIUM_REQUIRED";
      currentPlan: PlanId;
    };

export const COACH_RECOMMENDATION_HREFS: Record<CoachRecommendationType, string> = {
  flashcard_review: "/exercises/flashcard",
  weak_words: "/exercises/flashcard?focus=weak",
  speaking: "/speaking",
  listening: "/listening",
  writing: "/writing",
  theory: "/theory",
  keep_going: "/vocabulary",
};

export function emptyWeekActivity(): CoachWeekActivity {
  return {
    flashcardReviews: 0,
    againOrHard: 0,
    listeningLessons: 0,
    speakingSessions: 0,
    writingDocuments: 0,
    theoryNotes: 0,
  };
}

/** Start of the UTC day that is `days` before `now` (inclusive window for last N days). */
export function utcDaysAgoStart(days: number, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

export function emptyVocabularySummary(): CoachVocabularySummary {
  return { MASTERED: 0, REVIEW: 0, LEARNING: 0, NEW: 0 };
}

export function summarizeVocabulary(
  rows: Array<{ status: string; total: number }>,
): CoachVocabularySummary {
  const summary = emptyVocabularySummary();
  for (const row of rows) {
    if ((VOCAB_STATUSES as readonly string[]).includes(row.status)) {
      summary[row.status as VocabStatus] = row.total;
    }
  }
  return summary;
}

export function vocabularyTotal(summary: CoachVocabularySummary) {
  return VOCAB_STATUSES.reduce((sum, status) => sum + summary[status], 0);
}

/**
 * Words without progress, or with nextReviewAt in the past, are due.
 * Matches flashcard practice: null next review counts as due.
 */
export function countDueCards(input: {
  vocabularyTotal: number;
  notDueCount: number;
}) {
  return Math.max(0, input.vocabularyTotal - input.notDueCount);
}

export function pickWeakWords(words: string[], limit = 8) {
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const word of words) {
    const trimmed = word.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    picked.push(trimmed);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function pickWeakItems(items: WeakWordItem[], limit = 8): WeakWordItem[] {
  const seen = new Set<string>();
  const picked: WeakWordItem[] = [];
  for (const item of items) {
    const trimmed = item.word.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    picked.push({ word: trimmed, rating: item.rating });
    if (picked.length >= limit) break;
  }
  return picked;
}

const PRACTICE_MINUTES: Record<CoachRecommendationType, number> = {
  flashcard_review: 7,
  weak_words: 5,
  speaking: 8,
  listening: 8,
  writing: 10,
  theory: 8,
  keep_going: 10,
};

export function buildPracticePlan(
  recommendations: CoachRecommendation[],
  input: { dueCards: number; weakWords: string[] },
): CoachPracticeStep[] {
  return recommendations.slice(0, 3).map((item) => {
    let detail = item.reason;
    let minutes = PRACTICE_MINUTES[item.type];
    if (item.type === "flashcard_review" && input.dueCards > 0) {
      detail = `${input.dueCards} cards`;
      minutes = Math.min(12, Math.max(4, Math.round(input.dueCards * 0.6)));
    } else if (item.type === "weak_words" && input.weakWords.length > 0) {
      detail = `${input.weakWords.length} words`;
      minutes = Math.min(10, Math.max(4, input.weakWords.length * 2));
    } else if (item.type === "speaking") {
      detail = "Short speaking session";
    }
    return {
      type: item.type,
      href: item.href,
      estimatedMinutes: minutes,
      detail,
    };
  });
}

export function buildCoachTrends(
  previous: CoachWeekActivity,
  current: CoachWeekActivity,
): { trends: CoachTrend[]; available: boolean } {
  const keys: (keyof CoachWeekActivity)[] = [
    "flashcardReviews",
    "speakingSessions",
    "againOrHard",
    "listeningLessons",
    "writingDocuments",
    "theoryNotes",
  ];
  const hasAny = keys.some((key) => previous[key] > 0 || current[key] > 0);
  if (!hasAny) return { trends: [], available: false };

  const priorSignal = keys.some((key) => previous[key] > 0);
  if (!priorSignal) return { trends: [], available: false };

  return {
    available: true,
    trends: keys
      .filter((key) => previous[key] > 0 || current[key] > 0)
      .map((key) => ({
        key,
        previous: previous[key],
        current: current[key],
      })),
  };
}

export function buildCrossModuleHints(input: {
  last7Days: CoachWeekActivity;
  weakWords: string[];
}): CoachCrossModuleHint[] {
  const hints: CoachCrossModuleHint[] = [];
  if (input.last7Days.theoryNotes > 0) {
    hints.push({
      type: "theory_to_practice",
      href: "/exercises",
      reason: "Theory notes were updated recently — practice what you studied",
    });
  }
  if (input.weakWords.length > 0) {
    hints.push({
      type: "vocab_to_speaking",
      href: "/speaking",
      reason: `Use weak words in speaking: ${input.weakWords.slice(0, 3).join(", ")}`,
    });
  }
  return hints.slice(0, 2);
}

export function buildCoachRecommendations(input: {
  dueCards: number;
  weakWords: string[];
  last7Days: CoachWeekActivity;
  vocabularyTotal: number;
}): CoachRecommendation[] {
  const recommendations: CoachRecommendation[] = [];
  const hasHistory =
    input.vocabularyTotal > 0 ||
    input.last7Days.flashcardReviews > 0 ||
    input.last7Days.listeningLessons > 0 ||
    input.last7Days.speakingSessions > 0 ||
    input.last7Days.writingDocuments > 0 ||
    input.last7Days.theoryNotes > 0;

  if (input.dueCards > 0) {
    recommendations.push({
      type: "flashcard_review",
      href: COACH_RECOMMENDATION_HREFS.flashcard_review,
      reason: `${input.dueCards} cards are due`,
    });
  }
  if (input.weakWords.length > 0) {
    recommendations.push({
      type: "weak_words",
      href: COACH_RECOMMENDATION_HREFS.weak_words,
      reason: `${input.weakWords.length} words marked again or hard`,
    });
  }

  if (hasHistory && recommendations.length < 3) {
    if (input.last7Days.speakingSessions === 0) {
      recommendations.push({
        type: "speaking",
        href: COACH_RECOMMENDATION_HREFS.speaking,
        reason: "No speaking sessions in the last 7 days",
      });
    }
  }
  if (hasHistory && recommendations.length < 3) {
    if (input.last7Days.listeningLessons === 0) {
      recommendations.push({
        type: "listening",
        href: COACH_RECOMMENDATION_HREFS.listening,
        reason: "No listening lessons updated in the last 7 days",
      });
    }
  }
  if (hasHistory && recommendations.length < 3) {
    if (input.last7Days.writingDocuments === 0 && input.vocabularyTotal > 0) {
      recommendations.push({
        type: "writing",
        href: COACH_RECOMMENDATION_HREFS.writing,
        reason: "No writing documents updated in the last 7 days",
      });
    }
  }
  if (hasHistory && recommendations.length < 3) {
    if (input.last7Days.theoryNotes === 0 && input.vocabularyTotal > 0) {
      recommendations.push({
        type: "theory",
        href: COACH_RECOMMENDATION_HREFS.theory,
        reason: "No theory notes updated in the last 7 days",
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "keep_going",
      href: COACH_RECOMMENDATION_HREFS.keep_going,
      reason: hasHistory
        ? "Keep the rhythm you already have"
        : "Start with vocabulary, listening, or speaking",
    });
  }

  return recommendations.slice(0, 3);
}

export function isCoachEmpty(facts: Pick<CoachFacts, "vocabularyTotal" | "last7Days">) {
  const week = facts.last7Days;
  return (
    facts.vocabularyTotal === 0 &&
    week.flashcardReviews === 0 &&
    week.listeningLessons === 0 &&
    week.speakingSessions === 0 &&
    week.writingDocuments === 0 &&
    week.theoryNotes === 0
  );
}

export function buildDeterministicCoachNote(facts: CoachFacts) {
  if (isCoachEmpty(facts)) {
    return "You haven't built much learning history yet. Start with a few vocabulary reviews, a short speaking session, or a listening lesson and your coach will become more useful.";
  }

  const parts: string[] = [];
  const { vocabulary: vocab, dueCards, weakWords, language } = facts;

  if (facts.vocabularyTotal > 0) {
    parts.push(
      `You have ${vocab.MASTERED} mastered, ${vocab.REVIEW} to review, ${vocab.LEARNING} learning, and ${vocab.NEW} new vocabulary words in ${language}.`,
    );
  }
  if (dueCards > 0) {
    parts.push(`You have ${dueCards} cards due for review.`);
  }
  if (weakWords.length > 0) {
    parts.push(
      `Words recently marked again or hard include ${weakWords.slice(0, 5).join(", ")}.`,
    );
  }
  if (facts.last7Days.speakingSessions === 0 && facts.vocabularyTotal > 0) {
    parts.push("There are no speaking sessions in the last 7 days.");
  }

  if (parts.length === 0) {
    return "Your recent workspace activity is limited. Keep practicing and this coach will have more to work with.";
  }
  return parts.join(" ");
}

export function coachFactsForPrompt(facts: CoachFacts) {
  return {
    language: facts.language,
    mastered: facts.vocabulary.MASTERED,
    review: facts.vocabulary.REVIEW,
    learning: facts.vocabulary.LEARNING,
    new: facts.vocabulary.NEW,
    dueCards: facts.dueCards,
    weakWords: facts.weakWords,
    flashcardReviews7d: facts.last7Days.flashcardReviews,
    againOrHard7d: facts.last7Days.againOrHard,
    listeningLessons7d: facts.last7Days.listeningLessons,
    speakingSessions7d: facts.last7Days.speakingSessions,
    writingDocuments7d: facts.last7Days.writingDocuments,
    theoryNotes7d: facts.last7Days.theoryNotes,
  };
}

export function hashCoachFacts(facts: CoachFacts) {
  return createHash("sha256")
    .update(JSON.stringify(coachFactsForPrompt(facts)))
    .digest("hex")
    .slice(0, 24);
}

export function weekActivityHasModule(
  week: CoachWeekActivity,
  module: keyof CoachWeekActivity,
) {
  return week[module] >= 0;
}
