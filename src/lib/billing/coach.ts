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
  type CoachSnapshot,
  type CoachWeekActivity,
  type WeakWordItem,
  type WeakWordRating,
} from "@/lib/billing/coach-model";
import { resolveCoachNote } from "@/lib/billing/coach-note";
import {
  buildCoachNotices,
  buildProgressComparisons,
  computeLearningStreak,
  fillSeriesGaps,
  formatSeriesLabel,
  progressHistoryAvailable,
  progressPeriodWindows,
  seriesBucket,
  type CoachProgressMetricId,
  type CoachProgressPeriod,
  type CoachProgressPoint,
  type CoachProgressView,
  type CoachStreakDayActivity,
} from "@/lib/billing/coach-progress";
import { displayPlan, entitlementPlan, featureEnabled } from "@/lib/billing/plans";
import { getLanguageName } from "@/lib/languages";

export type { CoachProgressPeriod, CoachProgressView };

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

/** Shared period activity — same counters as the coach week cards, any window. */
export async function activityForRange(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}) {
  return weekActivityForRange(input);
}

async function getReviewSeries(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until: Date;
  bucket: "day" | "week";
  difficultOnly?: boolean;
}): Promise<CoachProgressPoint[]> {
  const conditions = [
    eq(flashcardReviews.userId, input.userId),
    eq(flashcardReviews.workspaceId, input.workspaceId),
    gte(flashcardReviews.createdAt, input.since),
    lt(flashcardReviews.createdAt, input.until),
  ];
  if (input.difficultOnly) {
    conditions.push(inArray(flashcardReviews.rating, ["AGAIN", "HARD"]));
  }

  const bucketExpr =
    input.bucket === "day"
      ? sql<Date>`date_trunc('day', ${flashcardReviews.createdAt})`
      : sql<Date>`date_trunc('week', ${flashcardReviews.createdAt})`;
  const [rows, sampleRows] = await Promise.all([
    db
      .select({
        bucket: bucketExpr,
        total: count(),
        firstAt: sql<Date>`min(${flashcardReviews.createdAt})`,
      })
      .from(flashcardReviews)
      .where(and(...conditions))
      .groupBy(bucketExpr)
      .orderBy(bucketExpr),
    db
      .select({
        createdAt: flashcardReviews.createdAt,
        word: vocabularyWords.word,
      })
      .from(flashcardReviews)
      .innerJoin(
        vocabularyWords,
        eq(vocabularyWords.id, flashcardReviews.wordId),
      )
      .where(and(...conditions))
      .orderBy(desc(flashcardReviews.createdAt))
      .limit(240),
  ]);

  const samplesByBucket = new Map<string, string[]>();
  for (const row of sampleRows) {
    const key = seriesBucketKey(row.createdAt, input.bucket);
    const list = samplesByBucket.get(key) ?? [];
    if (list.length < 4 && row.word && !list.includes(row.word)) {
      list.push(row.word);
      samplesByBucket.set(key, list);
    }
  }

  return rows.map((row) => {
    const start = new Date(row.bucket);
    const key = seriesBucketKey(start, input.bucket);
    return {
      bucketStart: start.toISOString(),
      label: formatSeriesLabel(start, input.bucket === "day" ? 7 : 30),
      value: Number(row.total),
      bucketKind: input.bucket,
      firstAt: row.firstAt ? new Date(row.firstAt).toISOString() : null,
      samples: samplesByBucket.get(key) ?? [],
    };
  });
}

async function getSpeakingSeries(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until: Date;
  bucket: "day" | "week";
}): Promise<CoachProgressPoint[]> {
  const bucketExpr =
    input.bucket === "day"
      ? sql<Date>`date_trunc('day', ${speakingSessions.createdAt})`
      : sql<Date>`date_trunc('week', ${speakingSessions.createdAt})`;
  const conditions = and(
    eq(speakingSessions.userId, input.userId),
    eq(speakingSessions.workspaceId, input.workspaceId),
    gte(speakingSessions.createdAt, input.since),
    lt(speakingSessions.createdAt, input.until),
  );

  const [rows, sampleRows] = await Promise.all([
    db
      .select({
        bucket: bucketExpr,
        total: count(),
        firstAt: sql<Date>`min(coalesce(${speakingSessions.startedAt}, ${speakingSessions.createdAt}))`,
      })
      .from(speakingSessions)
      .where(conditions)
      .groupBy(bucketExpr)
      .orderBy(bucketExpr),
    db
      .select({
        createdAt: speakingSessions.createdAt,
        title: speakingSessions.title,
        topic: speakingSessions.topic,
      })
      .from(speakingSessions)
      .where(conditions)
      .orderBy(desc(speakingSessions.createdAt))
      .limit(120),
  ]);

  const samplesByBucket = new Map<string, string[]>();
  for (const row of sampleRows) {
    const key = seriesBucketKey(row.createdAt, input.bucket);
    const label = (row.topic?.trim() || row.title?.trim() || "").trim();
    if (!label) continue;
    const list = samplesByBucket.get(key) ?? [];
    if (list.length < 3 && !list.includes(label)) {
      list.push(label);
      samplesByBucket.set(key, list);
    }
  }

  return rows.map((row) => {
    const start = new Date(row.bucket);
    const key = seriesBucketKey(start, input.bucket);
    return {
      bucketStart: start.toISOString(),
      label: formatSeriesLabel(start, input.bucket === "day" ? 7 : 30),
      value: Number(row.total),
      bucketKind: input.bucket,
      firstAt: row.firstAt ? new Date(row.firstAt).toISOString() : null,
      samples: samplesByBucket.get(key) ?? [],
    };
  });
}

function seriesBucketKey(date: Date, bucket: "day" | "week") {
  const d = new Date(date);
  if (bucket === "day") {
    return d.toISOString().slice(0, 10);
  }
  // Match Postgres date_trunc('week') Monday start in UTC
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function getActiveLearningDays(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}): Promise<string[]> {
  const until = input.until ?? new Date();
  const userId = input.userId;
  const workspaceId = input.workspaceId;

  const reviewDay = sql<Date>`date_trunc('day', ${flashcardReviews.createdAt})`;
  const speakingDay = sql<Date>`date_trunc('day', ${speakingSessions.createdAt})`;
  const listeningDay = sql<Date>`date_trunc('day', ${listeningLessons.updatedAt})`;
  const writingDay = sql<Date>`date_trunc('day', ${exercises.updatedAt})`;
  const theoryDay = sql<Date>`date_trunc('day', ${grammarNotes.updatedAt})`;

  const [reviews, speaking, listening, writing, theory] = await Promise.all([
    db
      .selectDistinct({ day: reviewDay })
      .from(flashcardReviews)
      .where(
        and(
          eq(flashcardReviews.userId, userId),
          eq(flashcardReviews.workspaceId, workspaceId),
          gte(flashcardReviews.createdAt, input.since),
          lt(flashcardReviews.createdAt, until),
        ),
      ),
    db
      .selectDistinct({ day: speakingDay })
      .from(speakingSessions)
      .where(
        and(
          eq(speakingSessions.userId, userId),
          eq(speakingSessions.workspaceId, workspaceId),
          gte(speakingSessions.createdAt, input.since),
          lt(speakingSessions.createdAt, until),
        ),
      ),
    db
      .selectDistinct({ day: listeningDay })
      .from(listeningLessons)
      .where(
        and(
          eq(listeningLessons.userId, userId),
          eq(listeningLessons.workspaceId, workspaceId),
          gte(listeningLessons.updatedAt, input.since),
          lt(listeningLessons.updatedAt, until),
        ),
      ),
    db
      .selectDistinct({ day: writingDay })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          eq(exercises.workspaceId, workspaceId),
          eq(exercises.type, "WRITING"),
          gte(exercises.updatedAt, input.since),
          lt(exercises.updatedAt, until),
        ),
      ),
    db
      .selectDistinct({ day: theoryDay })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.userId, userId),
          eq(grammarNotes.workspaceId, workspaceId),
          gte(grammarNotes.updatedAt, input.since),
          lt(grammarNotes.updatedAt, until),
        ),
      ),
  ]);

  const keys = new Set<string>();
  for (const row of [
    ...reviews,
    ...speaking,
    ...listening,
    ...writing,
    ...theory,
  ]) {
    if (row.day) keys.add(new Date(row.day).toISOString().slice(0, 10));
  }
  return [...keys];
}

function emptyStreakDayActivity(): CoachStreakDayActivity {
  return {
    flashcardReviews: 0,
    speakingSessions: 0,
    listeningLessons: 0,
    writingDocuments: 0,
    theoryNotes: 0,
  };
}

/** Per-day activity counts for streak tooltips (last N days). */
export async function getLearningDayActivity(input: {
  userId: string;
  workspaceId: string;
  since: Date;
  until?: Date;
}): Promise<Map<string, CoachStreakDayActivity>> {
  const until = input.until ?? new Date();
  const userId = input.userId;
  const workspaceId = input.workspaceId;

  const reviewDay = sql<Date>`date_trunc('day', ${flashcardReviews.createdAt})`;
  const speakingDay = sql<Date>`date_trunc('day', ${speakingSessions.createdAt})`;
  const listeningDay = sql<Date>`date_trunc('day', ${listeningLessons.updatedAt})`;
  const writingDay = sql<Date>`date_trunc('day', ${exercises.updatedAt})`;
  const theoryDay = sql<Date>`date_trunc('day', ${grammarNotes.updatedAt})`;

  const [reviews, speaking, listening, writing, theory] = await Promise.all([
    db
      .select({ day: reviewDay, total: count() })
      .from(flashcardReviews)
      .where(
        and(
          eq(flashcardReviews.userId, userId),
          eq(flashcardReviews.workspaceId, workspaceId),
          gte(flashcardReviews.createdAt, input.since),
          lt(flashcardReviews.createdAt, until),
        ),
      )
      .groupBy(reviewDay),
    db
      .select({ day: speakingDay, total: count() })
      .from(speakingSessions)
      .where(
        and(
          eq(speakingSessions.userId, userId),
          eq(speakingSessions.workspaceId, workspaceId),
          gte(speakingSessions.createdAt, input.since),
          lt(speakingSessions.createdAt, until),
        ),
      )
      .groupBy(speakingDay),
    db
      .select({ day: listeningDay, total: count() })
      .from(listeningLessons)
      .where(
        and(
          eq(listeningLessons.userId, userId),
          eq(listeningLessons.workspaceId, workspaceId),
          gte(listeningLessons.updatedAt, input.since),
          lt(listeningLessons.updatedAt, until),
        ),
      )
      .groupBy(listeningDay),
    db
      .select({ day: writingDay, total: count() })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          eq(exercises.workspaceId, workspaceId),
          eq(exercises.type, "WRITING"),
          gte(exercises.updatedAt, input.since),
          lt(exercises.updatedAt, until),
        ),
      )
      .groupBy(writingDay),
    db
      .select({ day: theoryDay, total: count() })
      .from(grammarNotes)
      .where(
        and(
          eq(grammarNotes.userId, userId),
          eq(grammarNotes.workspaceId, workspaceId),
          gte(grammarNotes.updatedAt, input.since),
          lt(grammarNotes.updatedAt, until),
        ),
      )
      .groupBy(theoryDay),
  ]);

  const byDay = new Map<string, CoachStreakDayActivity>();

  function bump(
    day: Date | string | null | undefined,
    key: keyof CoachStreakDayActivity,
    total: number,
  ) {
    if (!day) return;
    const dayKey = new Date(day).toISOString().slice(0, 10);
    const entry = byDay.get(dayKey) ?? emptyStreakDayActivity();
    entry[key] += total;
    byDay.set(dayKey, entry);
  }

  for (const row of reviews) {
    bump(row.day, "flashcardReviews", Number(row.total));
  }
  for (const row of speaking) {
    bump(row.day, "speakingSessions", Number(row.total));
  }
  for (const row of listening) {
    bump(row.day, "listeningLessons", Number(row.total));
  }
  for (const row of writing) {
    bump(row.day, "writingDocuments", Number(row.total));
  }
  for (const row of theory) {
    bump(row.day, "theoryNotes", Number(row.total));
  }

  return byDay;
}

/** Free for every plan — streak is activity history, not Coach intelligence. */
export async function getWorkspaceLearningStreak(input: {
  userId: string;
  workspaceId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const streakSince = utcDaysAgoStart(400, now);
  const recentSince = utcDaysAgoStart(7, now);

  const [activeDays, dayActivity] = await Promise.all([
    getActiveLearningDays({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: streakSince,
      until: now,
    }),
    getLearningDayActivity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: recentSince,
      until: now,
    }),
  ]);

  return computeLearningStreak(activeDays, now, dayActivity);
}

export async function getCoachProgress(input: {
  userId: string;
  workspaceId: string;
  periodDays: CoachProgressPeriod;
  metric?: CoachProgressMetricId;
  now?: Date;
  snapshot: CoachSnapshot;
}): Promise<CoachProgressView> {
  const periodDays = input.periodDays;
  const metric = input.metric ?? "flashcardReviews";
  const { currentStart, previousStart, previousUntil, now } =
    progressPeriodWindows(periodDays, input.now);
  const bucket = seriesBucket(periodDays);
  const streakSince = utcDaysAgoStart(400, now);
  const recentSince = utcDaysAgoStart(7, now);

  const [current, previous, rawSeries, activeDays, dayActivity] =
    await Promise.all([
    activityForRange({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: currentStart,
    }),
    activityForRange({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: previousStart,
      until: previousUntil,
    }),
    metric === "speakingSessions"
      ? getSpeakingSeries({
          userId: input.userId,
          workspaceId: input.workspaceId,
          since: currentStart,
          until: now,
          bucket,
        })
      : getReviewSeries({
          userId: input.userId,
          workspaceId: input.workspaceId,
          since: currentStart,
          until: now,
          bucket,
          difficultOnly: metric === "againOrHard",
        }),
    getActiveLearningDays({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: streakSince,
      until: now,
    }),
    getLearningDayActivity({
      userId: input.userId,
      workspaceId: input.workspaceId,
      since: recentSince,
      until: now,
    }),
  ]);

  const comparisons = buildProgressComparisons(previous, current);
  const points = fillSeriesGaps({
    points: rawSeries,
    since: currentStart,
    until: now,
    periodDays,
  });

  const seriesAlternates: CoachProgressMetricId[] = [
    "flashcardReviews",
    "againOrHard",
    "speakingSessions",
  ];

  return {
    periodDays,
    current,
    previous,
    comparisons,
    historyAvailable: progressHistoryAvailable(previous, current),
    series: { metric, points },
    seriesAlternates,
    notices: buildCoachNotices({
      comparisons,
      snapshot: input.snapshot,
    }),
    streak: computeLearningStreak(activeDays, now, dayActivity),
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
  periodDays?: CoachProgressPeriod;
  chartMetric?: CoachProgressMetricId;
}): Promise<
  | {
      ok: true;
      snapshot: CoachSnapshot;
      note: string;
      noteSource: "ai" | "deterministic";
      progress: CoachProgressView;
    }
  | {
      ok: false;
      code: "PREMIUM_REQUIRED";
      currentPlan: ReturnType<typeof displayPlan>;
    }
> {
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

  const [{ note, source }, progress] = await Promise.all([
    resolveCoachNote({
      userId: input.user.id,
      workspaceId: workspace.id,
      facts: data,
      forceRefresh: input.forceRefresh,
    }),
    getCoachProgress({
      userId: input.user.id,
      workspaceId: workspace.id,
      periodDays: input.periodDays ?? 30,
      metric: input.chartMetric ?? "flashcardReviews",
      now: input.now,
      snapshot,
    }),
  ]);

  return {
    ok: true,
    snapshot,
    note,
    noteSource: source,
    progress,
  };
}
