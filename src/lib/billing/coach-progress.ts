import {
  COACH_RECOMMENDATION_HREFS,
  type CoachRecommendation,
  type CoachRecommendationType,
  type CoachSnapshot,
  type CoachWeekActivity,
  utcDaysAgoStart,
} from "@/lib/billing/coach-model";

export const COACH_PROGRESS_PERIODS = [7, 30, 90] as const;
export type CoachProgressPeriod = (typeof COACH_PROGRESS_PERIODS)[number];

export type CoachProgressPoint = {
  /** ISO date (UTC) for the bucket start */
  bucketStart: string;
  /** Short label for chart axis */
  label: string;
  value: number;
  /** day = single calendar day; week = week bucket for 30/90 */
  bucketKind: "day" | "week";
  /** ISO timestamp of earliest event in the bucket, when known */
  firstAt?: string | null;
  /** Sample words or speaking titles from that bucket */
  samples?: string[];
};

export type CoachProgressMetricId =
  | "flashcardReviews"
  | "againOrHard"
  | "speakingSessions";

export type CoachProgressComparison = {
  key: keyof CoachWeekActivity;
  previous: number;
  current: number;
  delta: number;
};

export type CoachAttentionItem = {
  id: string;
  type: CoachRecommendationType;
  href: string;
  /** Machine detail for i18n interpolation */
  detail: {
    dueCards?: number;
    weakCount?: number;
    weakWords?: string[];
  };
};

export type CoachStreakDayActivity = {
  flashcardReviews: number;
  speakingSessions: number;
  listeningLessons: number;
  writingDocuments: number;
  theoryNotes: number;
};

export type CoachLearningStreak = {
  current: number;
  longest: number;
  practicedToday: boolean;
  /** Oldest → newest, last 7 UTC calendar days */
  recentDays: Array<{
    key: string;
    active: boolean;
    activity: CoachStreakDayActivity;
  }>;
};

export type CoachProgressView = {
  periodDays: CoachProgressPeriod;
  current: CoachWeekActivity;
  previous: CoachWeekActivity;
  comparisons: CoachProgressComparison[];
  /** True when either period has any activity signal */
  historyAvailable: boolean;
  series: {
    metric: CoachProgressMetricId;
    points: CoachProgressPoint[];
  };
  seriesAlternates: CoachProgressMetricId[];
  notices: string[];
  streak: CoachLearningStreak;
};

export function parseCoachProgressPeriod(
  value: string | string[] | undefined,
): CoachProgressPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export function parseCoachChartMetric(
  value: string | string[] | undefined,
): CoachProgressMetricId {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "flashcardReviews" ||
    raw === "againOrHard" ||
    raw === "speakingSessions"
  ) {
    return raw;
  }
  return "flashcardReviews";
}

export function progressPeriodWindows(
  periodDays: CoachProgressPeriod,
  now = new Date(),
) {
  const currentStart = utcDaysAgoStart(periodDays, now);
  const previousStart = utcDaysAgoStart(periodDays * 2, now);
  return {
    currentStart,
    previousStart,
    previousUntil: currentStart,
    now,
  };
}

export function buildProgressComparisons(
  previous: CoachWeekActivity,
  current: CoachWeekActivity,
): CoachProgressComparison[] {
  const keys = Object.keys(current) as Array<keyof CoachWeekActivity>;
  return keys
    .map((key) => ({
      key,
      previous: previous[key],
      current: current[key],
      delta: current[key] - previous[key],
    }))
    .filter((row) => row.previous > 0 || row.current > 0);
}

export function progressHistoryAvailable(
  previous: CoachWeekActivity,
  current: CoachWeekActivity,
) {
  return buildProgressComparisons(previous, current).length > 0;
}

/** Deterministic “why this?” bullets from observable facts. */
export function buildWhyEvidence(snapshot: CoachSnapshot): string[] {
  const reasons: string[] = [];
  const primary = snapshot.recommendations[0];

  if (snapshot.dueCards > 0) {
    reasons.push(`due:${snapshot.dueCards}`);
  }
  if (snapshot.weakWords.length > 0) {
    reasons.push(`weak:${snapshot.weakWords.length}`);
  }
  if (snapshot.last7Days.flashcardReviews > 0) {
    reasons.push(`reviews7d:${snapshot.last7Days.flashcardReviews}`);
  }
  if (
    snapshot.last7Days.speakingSessions === 0 &&
    snapshot.vocabularyTotal > 0
  ) {
    reasons.push("speaking_idle");
  }
  if (
    snapshot.last7Days.listeningLessons === 0 &&
    snapshot.vocabularyTotal > 0 &&
    primary?.type === "listening"
  ) {
    reasons.push("listening_idle");
  }
  if (
    snapshot.last7Days.writingDocuments === 0 &&
    primary?.type === "writing"
  ) {
    reasons.push("writing_idle");
  }
  if (snapshot.last7Days.theoryNotes === 0 && primary?.type === "theory") {
    reasons.push("theory_idle");
  }
  if (primary?.reason) {
    reasons.push(`focus:${primary.type}`);
  }

  // De-dupe while preserving order
  return [...new Set(reasons)].slice(0, 5);
}

export function buildAttentionItems(
  snapshot: CoachSnapshot,
): CoachAttentionItem[] {
  const items: CoachAttentionItem[] = [];

  if (snapshot.dueCards > 0) {
    items.push({
      id: "due",
      type: "flashcard_review",
      href: COACH_RECOMMENDATION_HREFS.flashcard_review,
      detail: { dueCards: snapshot.dueCards },
    });
  }
  if (snapshot.weakWords.length > 0) {
    items.push({
      id: "weak",
      type: "weak_words",
      href: COACH_RECOMMENDATION_HREFS.weak_words,
      detail: {
        weakCount: snapshot.weakWords.length,
        weakWords: snapshot.weakWords.slice(0, 5),
      },
    });
  }
  if (
    snapshot.last7Days.speakingSessions === 0 &&
    snapshot.vocabularyTotal > 0
  ) {
    items.push({
      id: "speaking",
      type: "speaking",
      href: COACH_RECOMMENDATION_HREFS.speaking,
      detail: {},
    });
  }
  if (
    snapshot.last7Days.listeningLessons === 0 &&
    snapshot.vocabularyTotal > 0 &&
    items.length < 4
  ) {
    items.push({
      id: "listening",
      type: "listening",
      href: COACH_RECOMMENDATION_HREFS.listening,
      detail: {},
    });
  }

  return items.slice(0, 4);
}

/**
 * Deterministic observations only — deltas and zeros, no invented causality.
 */
export function buildCoachNotices(input: {
  comparisons: CoachProgressComparison[];
  snapshot: Pick<
    CoachSnapshot,
    "dueCards" | "weakWords" | "vocabularyTotal" | "last7Days"
  >;
}): string[] {
  const notices: string[] = [];
  const byKey = new Map(
    input.comparisons.map((row) => [row.key, row] as const),
  );

  const reviews = byKey.get("flashcardReviews");
  if (reviews && reviews.delta > 0) {
    notices.push("reviews_up");
  } else if (reviews && reviews.delta < 0 && reviews.previous > 0) {
    notices.push("reviews_down");
  }

  const misses = byKey.get("againOrHard");
  if (misses && misses.delta < 0 && misses.previous > 0) {
    notices.push("misses_down");
  } else if (misses && misses.delta > 0) {
    notices.push("misses_up");
  }

  const speaking = byKey.get("speakingSessions");
  if (
    (speaking?.current === 0 ||
      (!speaking && input.snapshot.last7Days.speakingSessions === 0)) &&
    input.snapshot.vocabularyTotal > 0
  ) {
    notices.push("speaking_quiet");
  } else if (speaking && speaking.delta > 0) {
    notices.push("speaking_up");
  }

  if (input.snapshot.dueCards > 0) {
    notices.push("due_open");
  }
  if (input.snapshot.weakWords.length > 0) {
    notices.push("weak_open");
  }

  if (notices.length === 0 && input.comparisons.length === 0) {
    notices.push("getting_started");
  }

  return notices.slice(0, 4);
}

export function nextMoveEvidenceChips(snapshot: CoachSnapshot) {
  const chips: Array<{ id: string; value: number | string }> = [];
  if (snapshot.dueCards > 0) {
    chips.push({ id: "due", value: snapshot.dueCards });
  }
  if (snapshot.weakWords.length > 0) {
    chips.push({ id: "weak", value: snapshot.weakWords.length });
  }
  if (
    snapshot.last7Days.speakingSessions === 0 &&
    snapshot.vocabularyTotal > 0
  ) {
    chips.push({ id: "speaking_idle", value: 0 });
  }
  if (snapshot.vocabulary.MASTERED > 0) {
    chips.push({ id: "mastered", value: snapshot.vocabulary.MASTERED });
  }
  return chips.slice(0, 4);
}

export function primaryPracticeHref(snapshot: CoachSnapshot) {
  return (
    snapshot.practicePlan[0]?.href ??
    snapshot.recommendations[0]?.href ??
    COACH_RECOMMENDATION_HREFS.keep_going
  );
}

export function formatSeriesLabel(
  bucketStart: Date,
  periodDays: CoachProgressPeriod,
) {
  if (periodDays === 7) {
    return bucketStart.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }
  return bucketStart.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function seriesBucket(periodDays: CoachProgressPeriod): "day" | "week" {
  return periodDays === 7 ? "day" : "week";
}

export function fillSeriesGaps(input: {
  points: CoachProgressPoint[];
  since: Date;
  until: Date;
  periodDays: CoachProgressPeriod;
}): CoachProgressPoint[] {
  // Week buckets from Postgres date_trunc don't align cleanly with period starts.
  // Prefer real event buckets over invented zeros for 30/90-day views.
  if (input.periodDays !== 7) {
    return input.points;
  }

  const byKey = new Map(
    input.points.map((point) => [point.bucketStart.slice(0, 10), point]),
  );
  const filled: CoachProgressPoint[] = [];
  const cursor = new Date(input.since);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor < input.until) {
    const key = cursor.toISOString().slice(0, 10);
    const existing = byKey.get(key);
    filled.push(
      existing ?? {
        bucketStart: cursor.toISOString(),
        label: formatSeriesLabel(cursor, input.periodDays),
        value: 0,
        bucketKind: "day",
        firstAt: null,
        samples: [],
      },
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (filled.length > 14) break;
  }

  return filled;
}

export function progressAskQuestion(notices: string[]): string {
  if (notices.includes("speaking_quiet")) {
    return "Why has my vocabulary practice continued while my speaking activity is still low?";
  }
  if (notices.includes("misses_down") && notices.includes("reviews_up")) {
    return "Am I actually improving based on my recent reviews and difficult words?";
  }
  if (notices.includes("reviews_down")) {
    return "What changed in my learning this period, and what should I focus on next?";
  }
  return "What should I take away from my recent learning progress?";
}

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftUtcDayKey(key: string, deltaDays: number) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return utcDayKey(date);
}

/**
 * Duolingo-style streak from distinct UTC activity days.
 * If today is empty but yesterday is active, the streak still counts from yesterday.
 */
export function computeLearningStreak(
  activeDayKeys: Iterable<string>,
  now = new Date(),
  dayActivity: ReadonlyMap<string, CoachStreakDayActivity> = new Map(),
): CoachLearningStreak {
  const active = new Set(
    [...activeDayKeys].map((key) => key.slice(0, 10)).filter(Boolean),
  );
  const today = utcDayKey(now);
  const yesterday = shiftUtcDayKey(today, -1);
  const practicedToday = active.has(today);
  const emptyActivity = (): CoachStreakDayActivity => ({
    flashcardReviews: 0,
    speakingSessions: 0,
    listeningLessons: 0,
    writingDocuments: 0,
    theoryNotes: 0,
  });

  let current = 0;
  let cursor = practicedToday ? today : yesterday;
  if (active.has(cursor)) {
    while (active.has(cursor)) {
      current += 1;
      cursor = shiftUtcDayKey(cursor, -1);
    }
  }

  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    if (previous && shiftUtcDayKey(previous, 1) === day) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = day;
  }
  longest = Math.max(longest, current);

  const recentDays: CoachLearningStreak["recentDays"] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const key = shiftUtcDayKey(today, -offset);
    recentDays.push({
      key,
      active: active.has(key),
      activity: dayActivity.get(key) ?? emptyActivity(),
    });
  }

  return { current, longest, practicedToday, recentDays };
}

export function recommendationTitleKey(
  type: CoachRecommendationType,
): `focus.${string}` {
  const map: Record<CoachRecommendationType, `focus.${string}`> = {
    flashcard_review: "focus.review-due",
    weak_words: "focus.weak-words",
    listening: "focus.listening",
    speaking: "focus.speaking",
    writing: "focus.writing",
    theory: "focus.theory",
    keep_going: "focus.keep-going",
  };
  return map[type];
}
