import { and, count, desc, eq, gt, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  exercises,
  flashcardProgress,
  flashcardReviews,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  vocabularyWords,
  workspaces,
  type User,
} from "@/db/schema";
import {
  buildCoachRecommendations,
  countDueCards,
  emptyVocabularySummary,
  isCoachEmpty,
  pickWeakWords,
  summarizeVocabulary,
  utcDaysAgoStart,
  vocabularyTotal,
  type CoachFacts,
  type CoachResult,
  type CoachSnapshot,
  type CoachWeekActivity,
} from "@/lib/billing/coach-model";
import { resolveCoachNote } from "@/lib/billing/coach-note";
import { displayPlan, entitlementPlan, featureEnabled } from "@/lib/billing/plans";
import { getLanguageName } from "@/lib/languages";

type EntitlementUser = Pick<
  User,
  "id" | "role" | "subscriptionPlan" | "subscriptionStatus"
>;

/**
 * Weak words from recent Again/Hard reviews, then current lastRating.
 * Reusable later for practice-from-mistakes.
 */
export async function getWeakLearningItems(input: {
  userId: string;
  workspaceId: string;
  limit?: number;
}) {
  const limit = input.limit ?? 8;
  const since = utcDaysAgoStart(7);

  const recent = await db
    .select({
      word: vocabularyWords.word,
      createdAt: flashcardReviews.createdAt,
    })
    .from(flashcardReviews)
    .innerJoin(vocabularyWords, eq(vocabularyWords.id, flashcardReviews.wordId))
    .where(
      and(
        eq(flashcardReviews.userId, input.userId),
        eq(flashcardReviews.workspaceId, input.workspaceId),
        gte(flashcardReviews.createdAt, since),
        inArray(flashcardReviews.rating, ["AGAIN", "HARD"]),
      ),
    )
    .orderBy(desc(flashcardReviews.createdAt))
    .limit(40);

  const fromRecent = pickWeakWords(
    recent.map((row) => row.word),
    limit,
  );
  if (fromRecent.length >= limit) return fromRecent;

  const current = await db
    .select({
      word: vocabularyWords.word,
      updatedAt: flashcardProgress.updatedAt,
    })
    .from(flashcardProgress)
    .innerJoin(vocabularyWords, eq(vocabularyWords.id, flashcardProgress.wordId))
    .where(
      and(
        eq(flashcardProgress.userId, input.userId),
        eq(flashcardProgress.workspaceId, input.workspaceId),
        inArray(flashcardProgress.lastRating, ["AGAIN", "HARD"]),
      ),
    )
    .orderBy(desc(flashcardProgress.updatedAt))
    .limit(40);

  return pickWeakWords(
    [...fromRecent, ...current.map((row) => row.word)],
    limit,
  );
}

export async function getVocabularyInsights(input: {
  userId: string;
  workspaceId: string;
}) {
  const rows = await db
    .select({ status: vocabularyWords.status, total: count() })
    .from(vocabularyWords)
    .where(
      and(
        eq(vocabularyWords.userId, input.userId),
        eq(vocabularyWords.workspaceId, input.workspaceId),
      ),
    )
    .groupBy(vocabularyWords.status);

  const vocabulary = summarizeVocabulary(
    rows.map((row) => ({ status: row.status, total: Number(row.total) })),
  );
  return { vocabulary, total: vocabularyTotal(vocabulary) };
}

export async function getFlashcardInsights(input: {
  userId: string;
  workspaceId: string;
  vocabularyTotal: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const notDueRows = await db
    .select({ total: count() })
    .from(flashcardProgress)
    .where(
      and(
        eq(flashcardProgress.userId, input.userId),
        eq(flashcardProgress.workspaceId, input.workspaceId),
        gt(flashcardProgress.nextReviewAt, now),
      ),
    );
  const dueCards = countDueCards({
    vocabularyTotal: input.vocabularyTotal,
    notDueCount: Number(notDueRows[0]?.total ?? 0),
  });
  const weakWords = await getWeakLearningItems({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  return { dueCards, weakWords };
}

export async function getSpeakingInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
}) {
  const sessions = await db
    .select({ total: count() })
    .from(speakingSessions)
    .where(
      and(
        eq(speakingSessions.userId, input.userId),
        eq(speakingSessions.workspaceId, input.workspaceId),
        gte(speakingSessions.createdAt, input.since),
      ),
    );

  return {
    sessionsLast7Days: Number(sessions[0]?.total ?? 0),
  };
}

export async function getListeningInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
}) {
  const rows = await db
    .select({ total: count() })
    .from(listeningLessons)
    .where(
      and(
        eq(listeningLessons.userId, input.userId),
        eq(listeningLessons.workspaceId, input.workspaceId),
        gte(listeningLessons.updatedAt, input.since),
      ),
    );
  return { lessonsUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

export async function getWritingInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
}) {
  const rows = await db
    .select({ total: count() })
    .from(exercises)
    .where(
      and(
        eq(exercises.userId, input.userId),
        eq(exercises.workspaceId, input.workspaceId),
        eq(exercises.type, "WRITING"),
        gte(exercises.updatedAt, input.since),
      ),
    );
  return { documentsUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

export async function getTheoryInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
}) {
  const rows = await db
    .select({ total: count() })
    .from(grammarNotes)
    .where(
      and(
        eq(grammarNotes.userId, input.userId),
        eq(grammarNotes.workspaceId, input.workspaceId),
        gte(grammarNotes.updatedAt, input.since),
      ),
    );
  return { notesUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

async function getReviewActivity(input: {
  userId: string;
  workspaceId: string;
  since: Date;
}) {
  const rows = await db
    .select({ rating: flashcardReviews.rating, total: count() })
    .from(flashcardReviews)
    .where(
      and(
        eq(flashcardReviews.userId, input.userId),
        eq(flashcardReviews.workspaceId, input.workspaceId),
        gte(flashcardReviews.createdAt, input.since),
      ),
    )
    .groupBy(flashcardReviews.rating);

  const flashcardReviewsTotal = rows.reduce(
    (sum, row) => sum + Number(row.total),
    0,
  );
  const againOrHard = rows
    .filter((row) => row.rating === "AGAIN" || row.rating === "HARD")
    .reduce((sum, row) => sum + Number(row.total), 0);

  return { flashcardReviews: flashcardReviewsTotal, againOrHard };
}

export async function getLearningCoachData(input: {
  userId: string;
  workspaceId: string;
  language: string;
  now?: Date;
}): Promise<CoachFacts & { recommendations: CoachSnapshot["recommendations"]; empty: boolean }> {
  const now = input.now ?? new Date();
  const since = utcDaysAgoStart(7, now);

  const [
    vocabularyInsights,
    speakingInsights,
    listeningInsights,
    writingInsights,
    theoryInsights,
    reviewActivity,
  ] = await Promise.all([
    getVocabularyInsights({
      userId: input.userId,
      workspaceId: input.workspaceId,
    }),
    getSpeakingInsights({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since,
    }),
    getListeningInsights({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since,
    }),
    getWritingInsights({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since,
    }),
    getTheoryInsights({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since,
    }),
    getReviewActivity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since,
    }),
  ]);

  const flashcardInsights = await getFlashcardInsights({
    userId: input.userId,
    workspaceId: input.workspaceId,
    vocabularyTotal: vocabularyInsights.total,
    now,
  });

  const last7Days: CoachWeekActivity = {
    flashcardReviews: reviewActivity.flashcardReviews,
    againOrHard: reviewActivity.againOrHard,
    listeningLessons: listeningInsights.lessonsUpdatedLast7Days,
    speakingSessions: speakingInsights.sessionsLast7Days,
    writingDocuments: writingInsights.documentsUpdatedLast7Days,
    theoryNotes: theoryInsights.notesUpdatedLast7Days,
  };

  const facts: CoachFacts = {
    language: getLanguageName(input.language),
    vocabulary: vocabularyInsights.vocabulary,
    vocabularyTotal: vocabularyInsights.total,
    dueCards: flashcardInsights.dueCards,
    weakWords: flashcardInsights.weakWords,
    last7Days,
    rangeStartUtc: since.toISOString(),
    rangeEndUtc: now.toISOString(),
  };

  return {
    ...facts,
    recommendations: buildCoachRecommendations({
      dueCards: facts.dueCards,
      weakWords: facts.weakWords,
      last7Days: facts.last7Days,
      vocabularyTotal: facts.vocabularyTotal,
    }),
    empty: isCoachEmpty(facts),
  };
}

export async function getLearningCoach(input: {
  user: EntitlementUser;
  workspaceId: string;
  language?: string;
  forceRefresh?: boolean;
  now?: Date;
}): Promise<CoachResult> {
  const plan = entitlementPlan(input.user);
  if (!featureEnabled(plan, "ai_learning_coach")) {
    return {
      ok: false,
      code: "PREMIUM_REQUIRED",
      currentPlan: displayPlan(input.user),
    };
  }

  const workspace = await db.query.workspaces.findFirst({
    where: and(
      eq(workspaces.id, input.workspaceId),
      eq(workspaces.userId, input.user.id),
    ),
    columns: { id: true, language: true },
  });
  if (!workspace) {
    throw new Error("UNAUTHORIZED");
  }

  const data = await getLearningCoachData({
    userId: input.user.id,
    workspaceId: workspace.id,
    language: input.language ?? workspace.language,
    now: input.now,
  });

  const { note, source } = await resolveCoachNote({
    userId: input.user.id,
    workspaceId: workspace.id,
    facts: data,
    forceRefresh: input.forceRefresh,
  });

  const snapshot: CoachSnapshot = {
    language: data.language,
    vocabulary: data.vocabulary || emptyVocabularySummary(),
    vocabularyTotal: data.vocabularyTotal,
    dueCards: data.dueCards,
    weakWords: data.weakWords,
    last7Days: data.last7Days,
    rangeStartUtc: data.rangeStartUtc,
    rangeEndUtc: data.rangeEndUtc,
    recommendations: data.recommendations,
    empty: data.empty,
  };

  return {
    ok: true,
    snapshot,
    note,
    noteSource: source,
  };
}
