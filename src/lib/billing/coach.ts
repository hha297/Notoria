import { and, count, desc, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
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
  buildCoachTrends,
  buildCrossModuleHints,
  buildPracticePlan,
  countDueCards,
  emptyVocabularySummary,
  emptyWeekActivity,
  isCoachEmpty,
  pickWeakItems,
  summarizeVocabulary,
  utcDaysAgoStart,
  vocabularyTotal,
  type CoachFacts,
  type CoachResult,
  type CoachSnapshot,
  type CoachWeekActivity,
  type WeakWordItem,
  type WeakWordRating,
} from "@/lib/billing/coach-model";
import { resolveCoachNote } from "@/lib/billing/coach-note";
import { displayPlan, entitlementPlan, featureEnabled } from "@/lib/billing/plans";
import { getLanguageName } from "@/lib/languages";

type EntitlementUser = Pick<
  User,
  "id" | "role" | "subscriptionPlan" | "subscriptionStatus"
>;

function asWeakRating(value: string | null | undefined): WeakWordRating | null {
  if (value === "AGAIN" || value === "HARD") return value;
  return null;
}

/**
 * Weak words from recent Again/Hard reviews, then current lastRating.
 * Powers practice-from-mistakes on the coach.
 */
export async function getWeakLearningItems(input: {
  userId: string;
  workspaceId: string;
  limit?: number;
}): Promise<WeakWordItem[]> {
  const limit = input.limit ?? 8;
  const since = utcDaysAgoStart(7);

  const recent = await db
    .select({
      word: vocabularyWords.word,
      rating: flashcardReviews.rating,
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

  const fromRecent: WeakWordItem[] = [];
  for (const row of recent) {
    const rating = asWeakRating(row.rating);
    if (!rating) continue;
    fromRecent.push({ word: row.word, rating });
  }
  const picked = pickWeakItems(fromRecent, limit);
  if (picked.length >= limit) return picked;

  const current = await db
    .select({
      word: vocabularyWords.word,
      rating: flashcardProgress.lastRating,
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

  const fromCurrent: WeakWordItem[] = [];
  for (const row of current) {
    const rating = asWeakRating(row.rating);
    if (!rating) continue;
    fromCurrent.push({ word: row.word, rating });
  }

  return pickWeakItems([...picked, ...fromCurrent], limit);
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
  const weakItems = await getWeakLearningItems({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });
  return {
    dueCards,
    weakItems,
    weakWords: weakItems.map((item) => item.word),
  };
}

export async function getSpeakingInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  const conditions = [
    eq(speakingSessions.userId, input.userId),
    eq(speakingSessions.workspaceId, input.workspaceId),
    gte(speakingSessions.createdAt, input.since),
  ];
  if (input.until) {
    conditions.push(lt(speakingSessions.createdAt, input.until));
  }
  const sessions = await db
    .select({ total: count() })
    .from(speakingSessions)
    .where(and(...conditions));

  return {
    sessionsLast7Days: Number(sessions[0]?.total ?? 0),
  };
}

export async function getLatestSpeakingLevel(input: {
  userId: string;
  workspaceId: string;
}) {
  const row = await db
    .select({ cefrLevel: speakingSessions.cefrLevel })
    .from(speakingSessions)
    .where(
      and(
        eq(speakingSessions.userId, input.userId),
        eq(speakingSessions.workspaceId, input.workspaceId),
        isNotNull(speakingSessions.cefrLevel),
        sql`trim(${speakingSessions.cefrLevel}) <> ''`,
      ),
    )
    .orderBy(desc(speakingSessions.updatedAt))
    .limit(1);

  const level = row[0]?.cefrLevel?.trim();
  return level || null;
}

export async function getListeningInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  const conditions = [
    eq(listeningLessons.userId, input.userId),
    eq(listeningLessons.workspaceId, input.workspaceId),
    gte(listeningLessons.updatedAt, input.since),
  ];
  if (input.until) {
    conditions.push(lt(listeningLessons.updatedAt, input.until));
  }
  const rows = await db
    .select({ total: count() })
    .from(listeningLessons)
    .where(and(...conditions));
  return { lessonsUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

export async function getWritingInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  const conditions = [
    eq(exercises.userId, input.userId),
    eq(exercises.workspaceId, input.workspaceId),
    eq(exercises.type, "WRITING"),
    gte(exercises.updatedAt, input.since),
  ];
  if (input.until) {
    conditions.push(lt(exercises.updatedAt, input.until));
  }
  const rows = await db
    .select({ total: count() })
    .from(exercises)
    .where(and(...conditions));
  return { documentsUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

export async function getTheoryInsights(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  const conditions = [
    eq(grammarNotes.userId, input.userId),
    eq(grammarNotes.workspaceId, input.workspaceId),
    gte(grammarNotes.updatedAt, input.since),
  ];
  if (input.until) {
    conditions.push(lt(grammarNotes.updatedAt, input.until));
  }
  const rows = await db
    .select({ total: count() })
    .from(grammarNotes)
    .where(and(...conditions));
  return { notesUpdatedLast7Days: Number(rows[0]?.total ?? 0) };
}

export async function getReviewActivity(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  const conditions = [
    eq(flashcardReviews.userId, input.userId),
    eq(flashcardReviews.workspaceId, input.workspaceId),
    gte(flashcardReviews.createdAt, input.since),
  ];
  if (input.until) {
    conditions.push(lt(flashcardReviews.createdAt, input.until));
  }

  const rows = await db
    .select({
      rating: flashcardReviews.rating,
      total: count(),
    })
    .from(flashcardReviews)
    .where(and(...conditions))
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

async function weekActivityForRange(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}): Promise<CoachWeekActivity> {
  const [speaking, listening, writing, theory, review] = await Promise.all([
    getSpeakingInsights(input),
    getListeningInsights(input),
    getWritingInsights(input),
    getTheoryInsights(input),
    getReviewActivity(input),
  ]);
  return {
    flashcardReviews: review.flashcardReviews,
    againOrHard: review.againOrHard,
    listeningLessons: listening.lessonsUpdatedLast7Days,
    speakingSessions: speaking.sessionsLast7Days,
    writingDocuments: writing.documentsUpdatedLast7Days,
    theoryNotes: theory.notesUpdatedLast7Days,
  };
}

export async function getLearningCoachData(input: {
  userId: string;
  workspaceId: string;
  language: string;
  now?: Date;
}): Promise<
  CoachFacts & {
    recommendations: CoachSnapshot["recommendations"];
    practicePlan: CoachSnapshot["practicePlan"];
    trends: CoachSnapshot["trends"];
    trendsAvailable: boolean;
    path: CoachSnapshot["path"];
    crossModule: CoachSnapshot["crossModule"];
    empty: boolean;
  }
> {
  const now = input.now ?? new Date();
  const since = utcDaysAgoStart(7, now);
  const previousSince = utcDaysAgoStart(14, now);

  const [vocabularyInsights, speakingLevel, last7Days, previous7Days] =
    await Promise.all([
      getVocabularyInsights({
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
      getLatestSpeakingLevel({
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
      weekActivityForRange({
        userId: input.userId,
        workspaceId: input.workspaceId,
        since,
      }),
      weekActivityForRange({
        userId: input.userId,
        workspaceId: input.workspaceId,
        since: previousSince,
        until: since,
      }),
    ]);

  const flashcards = await getFlashcardInsights({
    userId: input.userId,
    workspaceId: input.workspaceId,
    vocabularyTotal: vocabularyInsights.total,
    now,
  });

  const facts: CoachFacts = {
    language: getLanguageName(input.language),
    vocabulary: vocabularyInsights.vocabulary,
    vocabularyTotal: vocabularyInsights.total,
    dueCards: flashcards.dueCards,
    weakWords: flashcards.weakWords,
    weakItems: flashcards.weakItems,
    speakingLevel,
    last7Days: last7Days ?? emptyWeekActivity(),
    previous7Days: previous7Days ?? emptyWeekActivity(),
    rangeStartUtc: since.toISOString(),
    rangeEndUtc: now.toISOString(),
  };

  const recommendations = buildCoachRecommendations({
    dueCards: facts.dueCards,
    weakWords: facts.weakWords,
    last7Days: facts.last7Days,
    vocabularyTotal: facts.vocabularyTotal,
  });
  const practicePlan = buildPracticePlan(recommendations, {
    dueCards: facts.dueCards,
    weakWords: facts.weakWords,
  });
  const { trends, available: trendsAvailable } = buildCoachTrends(
    facts.previous7Days,
    facts.last7Days,
  );
  const crossModule = buildCrossModuleHints({
    last7Days: facts.last7Days,
    weakWords: facts.weakWords,
  });

  return {
    ...facts,
    recommendations,
    practicePlan,
    trends,
    trendsAvailable,
    path: recommendations,
    crossModule,
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
    weakItems: data.weakItems,
    speakingLevel: data.speakingLevel,
    last7Days: data.last7Days,
    previous7Days: data.previous7Days,
    rangeStartUtc: data.rangeStartUtc,
    rangeEndUtc: data.rangeEndUtc,
    recommendations: data.recommendations,
    practicePlan: data.practicePlan,
    trends: data.trends,
    trendsAvailable: data.trendsAvailable,
    path: data.path,
    crossModule: data.crossModule,
    empty: data.empty,
  };

  return {
    ok: true,
    snapshot,
    note,
    noteSource: source,
  };
}
