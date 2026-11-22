/**
 * Client-persisted practice stats for vocabulary exercises (no DB migration).
 * Used for learning-aware session sampling across Try Again / remounts.
 */

import type { PracticeSortId } from "@/types/flashcards";

export type { PracticeSortId };

export type WordPracticeStats = {
  attempts: number;
  correct: number;
  incorrect: number;
  /** Consecutive correct answers ending at lastSeenAt (0 after a miss). */
  correctStreak: number;
  lastSeenAt: number;
  lastCorrectAt?: number;
  lastIncorrectAt?: number;
};

export type PracticeHistorySnapshot = {
  version: 1;
  /** Per-word cumulative stats. */
  words: Record<string, WordPracticeStats>;
  /** Recent completed session word-id lists (newest first), capped. */
  recentSessions: string[][];
};

export const PRACTICE_HISTORY_VERSION = 1 as const;
export const PRACTICE_HISTORY_MAX_SESSIONS = 3;
export const RECENTLY_ADDED_WINDOW_MS = 48 * 60 * 60 * 1000;

export function emptyPracticeHistory(): PracticeHistorySnapshot {
  return { version: PRACTICE_HISTORY_VERSION, words: {}, recentSessions: [] };
}

export function practiceHistoryStorageKey(
  workspaceId: string,
  mode = "exercises",
) {
  return `notoria.practice-history.v1:${workspaceId}:${mode}`;
}

export function parsePracticeHistory(raw: unknown): PracticeHistorySnapshot {
  if (!raw || typeof raw !== "object") return emptyPracticeHistory();
  const data = raw as Partial<PracticeHistorySnapshot>;
  if (data.version !== 1 || typeof data.words !== "object" || !data.words) {
    return emptyPracticeHistory();
  }
  const words: Record<string, WordPracticeStats> = {};
  for (const [wordId, stats] of Object.entries(data.words)) {
    if (!stats || typeof stats !== "object") continue;
    words[wordId] = {
      attempts: Math.max(0, Number(stats.attempts) || 0),
      correct: Math.max(0, Number(stats.correct) || 0),
      incorrect: Math.max(0, Number(stats.incorrect) || 0),
      correctStreak: Math.max(0, Number(stats.correctStreak) || 0),
      lastSeenAt: Math.max(0, Number(stats.lastSeenAt) || 0),
      lastCorrectAt:
        stats.lastCorrectAt != null
          ? Math.max(0, Number(stats.lastCorrectAt) || 0)
          : undefined,
      lastIncorrectAt:
        stats.lastIncorrectAt != null
          ? Math.max(0, Number(stats.lastIncorrectAt) || 0)
          : undefined,
    };
  }
  const recentSessions = Array.isArray(data.recentSessions)
    ? data.recentSessions
        .filter((row): row is string[] => Array.isArray(row))
        .map((row) => row.filter((id) => typeof id === "string" && id.length > 0))
        .filter((row) => row.length > 0)
        .slice(0, PRACTICE_HISTORY_MAX_SESSIONS)
    : [];
  return { version: 1, words, recentSessions };
}

export function loadPracticeHistory(
  workspaceId: string,
  storage: Pick<Storage, "getItem"> = globalThis.localStorage,
): PracticeHistorySnapshot {
  if (!workspaceId || typeof storage?.getItem !== "function") {
    return emptyPracticeHistory();
  }
  try {
    const raw = storage.getItem(practiceHistoryStorageKey(workspaceId));
    if (!raw) return emptyPracticeHistory();
    return parsePracticeHistory(JSON.parse(raw));
  } catch {
    return emptyPracticeHistory();
  }
}

export function savePracticeHistory(
  workspaceId: string,
  snapshot: PracticeHistorySnapshot,
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
) {
  if (!workspaceId || typeof storage?.setItem !== "function") return;
  try {
    storage.setItem(
      practiceHistoryStorageKey(workspaceId),
      JSON.stringify(snapshot),
    );
  } catch {
    // Quota / private mode — ignore.
  }
}

export function recordPracticeAttempt(
  snapshot: PracticeHistorySnapshot,
  wordId: string,
  correct: boolean,
  now = Date.now(),
): PracticeHistorySnapshot {
  const prev = snapshot.words[wordId];
  const next: WordPracticeStats = {
    attempts: (prev?.attempts ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    incorrect: (prev?.incorrect ?? 0) + (correct ? 0 : 1),
    correctStreak: correct ? (prev?.correctStreak ?? 0) + 1 : 0,
    lastSeenAt: now,
    lastCorrectAt: correct ? now : prev?.lastCorrectAt,
    lastIncorrectAt: correct ? prev?.lastIncorrectAt : now,
  };
  return {
    ...snapshot,
    words: { ...snapshot.words, [wordId]: next },
  };
}

export function commitPracticeSession(
  snapshot: PracticeHistorySnapshot,
  wordIds: string[],
): PracticeHistorySnapshot {
  const unique = [...new Set(wordIds.filter(Boolean))];
  if (unique.length === 0) return snapshot;
  return {
    ...snapshot,
    recentSessions: [unique, ...snapshot.recentSessions].slice(
      0,
      PRACTICE_HISTORY_MAX_SESSIONS,
    ),
  };
}

export function isRecentlyAdded(
  createdAt: Date | string | number | null | undefined,
  now = Date.now(),
  windowMs = RECENTLY_ADDED_WINDOW_MS,
) {
  const ms =
    createdAt == null
      ? 0
      : typeof createdAt === "number"
        ? createdAt
        : createdAt instanceof Date
          ? createdAt.getTime()
          : Date.parse(String(createdAt));
  if (!Number.isFinite(ms) || ms <= 0) return false;
  return now - ms <= windowMs;
}

/** Hours since lastSeen; large when never seen. */
function hoursSince(lastSeenAt: number | undefined, now: number) {
  if (!lastSeenAt || lastSeenAt <= 0) return 24 * 365;
  return Math.max(0, (now - lastSeenAt) / (1000 * 60 * 60));
}

/**
 * Selection weight for a word. Higher = more likely.
 * Never zero — mastered words stay eligible for occasional review.
 */
export function practiceSelectionWeight(
  stats: WordPracticeStats | undefined,
  options: {
    now?: number;
    inLastSession?: boolean;
    inPriorSession?: boolean;
    createdAtMs?: number;
  } = {},
): number {
  const now = options.now ?? Date.now();
  const ageHours = hoursSince(stats?.lastSeenAt, now);
  const createdBoost =
    options.createdAtMs && now - options.createdAtMs < RECENTLY_ADDED_WINDOW_MS
      ? 1.35
      : 1;

  let weight: number;
  if (!stats || stats.attempts === 0) {
    weight = 10 * createdBoost;
  } else if ((stats.incorrect > 0 && stats.correctStreak === 0) ||
    (stats.lastIncorrectAt &&
      (!stats.lastCorrectAt || stats.lastIncorrectAt >= stats.lastCorrectAt))) {
    // Recent miss — high priority, but cooldown if seen very recently.
    const missAge = hoursSince(stats.lastIncorrectAt ?? stats.lastSeenAt, now);
    const cooldown = missAge < 0.25 ? 0.35 : missAge < 2 ? 0.7 : 1;
    weight = 7 * cooldown * createdBoost;
  } else {
    // Correct streak reduces weight; long absence brings it back.
    const mastery = 1 / (1 + stats.correctStreak * 1.4 + stats.correct * 0.15);
    const spaced = 1 + Math.min(4, Math.log10(1 + ageHours / 24));
    weight = Math.max(0.35, 2.2 * mastery * spaced) * createdBoost;
  }

  if (options.inLastSession) weight *= 0.12;
  else if (options.inPriorSession) weight *= 0.4;

  return Math.max(0.05, weight);
}

/**
 * Efraimidis–Spirakis weighted random sample without replacement.
 * `random` injectable for tests.
 */
export function weightedSampleUnique<T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number,
  random: () => number = Math.random,
): T[] {
  if (items.length === 0 || count <= 0) return [];
  const target = Math.min(count, items.length);
  const keyed = items.map((item) => {
    const weight = Math.max(0.05, getWeight(item));
    const u = Math.max(Number.EPSILON, random());
    return { item, key: Math.pow(u, 1 / weight) };
  });
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, target).map((row) => row.item);
}

export function sortWordsByPractice<T>(
  words: T[],
  sort: PracticeSortId,
  getWordId: (word: T) => string,
  getCreatedAt: (word: T) => Date | string | number | null | undefined,
  history: PracticeHistorySnapshot,
): T[] {
  const toMs = (value: Date | string | number | null | undefined) => {
    if (value == null) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) {
      const t = value.getTime();
      return Number.isFinite(t) ? t : 0;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const copy = [...words];
  copy.sort((left, right) => {
    const leftId = getWordId(left);
    const rightId = getWordId(right);
    const leftStats = history.words[leftId];
    const rightStats = history.words[rightId];
    const leftCreated = toMs(getCreatedAt(left));
    const rightCreated = toMs(getCreatedAt(right));

    switch (sort) {
      case "newest":
        return rightCreated - leftCreated || leftId.localeCompare(rightId);
      case "oldest":
        return leftCreated - rightCreated || leftId.localeCompare(rightId);
      case "last_practiced": {
        const l = leftStats?.lastSeenAt ?? 0;
        const r = rightStats?.lastSeenAt ?? 0;
        // Never practiced sink to bottom
        if (l === 0 && r === 0) return rightCreated - leftCreated;
        if (l === 0) return 1;
        if (r === 0) return -1;
        return r - l || leftId.localeCompare(rightId);
      }
      case "least_recently_practiced": {
        const l = leftStats?.lastSeenAt ?? 0;
        const r = rightStats?.lastSeenAt ?? 0;
        // Never practiced first
        if (l === 0 && r === 0) return rightCreated - leftCreated;
        if (l === 0) return -1;
        if (r === 0) return 1;
        return l - r || leftId.localeCompare(rightId);
      }
      case "most_practiced": {
        const l = leftStats?.attempts ?? 0;
        const r = rightStats?.attempts ?? 0;
        return r - l || rightCreated - leftCreated;
      }
      case "least_practiced": {
        const l = leftStats?.attempts ?? 0;
        const r = rightStats?.attempts ?? 0;
        return l - r || rightCreated - leftCreated;
      }
      default:
        return 0;
    }
  });
  return copy;
}
