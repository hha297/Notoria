import { shuffleArray } from "@/lib/exercises/utils";

export type ExerciseSessionMode =
  | "flashcards"
  | "fill_blank"
  | "multiple_choice"
  | "match_pairs"
  | "type_answer"
  | "form_sentence";

/** Maximum items (or pairs) per exercise session. */
export const SESSION_SIZE_MAX_BY_MODE: Record<ExerciseSessionMode, number> = {
  flashcards: 30,
  fill_blank: 15,
  multiple_choice: 20,
  match_pairs: 10,
  type_answer: 15,
  form_sentence: 10,
};

/** Optional min–max range; when set, session size is randomized in range. */
export const SESSION_SIZE_RANGE_BY_MODE: Partial<
  Record<ExerciseSessionMode, { min: number; max: number }>
> = {
  form_sentence: { min: 5, max: 10 },
};

/** Target share of items drawn from the newest-word pool when possible. */
export const DEFAULT_NEWEST_RATIO = 0.8;

export type SessionSamplePreferences<T> = {
  getWordId: (item: T) => string;
  getCreatedAt?: (item: T) => Date | string | number | null | undefined;
  /** Soft-avoid: answered correctly in the previous section. */
  softAvoidWordIds?: Iterable<string>;
  /** Soft-prefer: answered incorrectly in the previous section. */
  softPreferWordIds?: Iterable<string>;
  /** Soft-avoid repeating the exact previous sentence/item. */
  softAvoidItemKeys?: Iterable<string>;
  getItemKey?: (item: T) => string;
  newestRatio?: number;
};

/** Cap session length at the mode maximum; use all items when fewer are available. */
export function pickSessionSize(available: number, max: number): number {
  if (available <= 0) return 0;
  return Math.min(available, max);
}

export function pickSessionSizeInRange(
  available: number,
  min: number,
  max: number,
): number {
  if (available <= 0) return 0;
  if (available < min) return available;
  const upper = Math.min(available, max);
  return min + Math.floor(Math.random() * (upper - min + 1));
}

function toCreatedAtMs(
  value: Date | string | number | null | undefined,
): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Rank items within a pool: prefer incorrect/recent-miss words, then fresh
 * sentences, then previously-seen sentences — each bucket shuffled.
 */
function rankWithinPool<T>(
  pool: T[],
  getWordId: (item: T) => string,
  getItemKey: ((item: T) => string) | undefined,
  softPrefer: Set<string>,
  avoidKeys: Set<string>,
): T[] {
  type Scored = { item: T; prefer: boolean; itemAvoid: boolean };
  const scored: Scored[] = pool.map((item) => {
    const key = getItemKey?.(item);
    return {
      item,
      prefer: softPrefer.has(getWordId(item)),
      itemAvoid: key != null && avoidKeys.has(key),
    };
  });

  const preferFresh = shuffleArray(
    scored.filter((row) => row.prefer && !row.itemAvoid).map((row) => row.item),
  );
  const normalFresh = shuffleArray(
    scored.filter((row) => !row.prefer && !row.itemAvoid).map((row) => row.item),
  );
  const preferReuse = shuffleArray(
    scored.filter((row) => row.prefer && row.itemAvoid).map((row) => row.item),
  );
  const normalReuse = shuffleArray(
    scored.filter((row) => !row.prefer && row.itemAvoid).map((row) => row.item),
  );

  return [...preferFresh, ...normalFresh, ...preferReuse, ...normalReuse];
}

/**
 * Preference-based session sampling:
 * newest-word bias (~80%), soft-avoid recent correct, soft-prefer recent
 * incorrect, soft sentence dedup — never a hard blacklist.
 */
export function sampleItemsWithPreferences<T>(
  items: T[],
  count: number,
  preferences: SessionSamplePreferences<T>,
): T[] {
  if (items.length === 0 || count <= 0) return [];

  const target = Math.min(count, items.length);
  const {
    getWordId,
    getCreatedAt,
    getItemKey,
    newestRatio = DEFAULT_NEWEST_RATIO,
  } = preferences;
  const softAvoid = new Set(preferences.softAvoidWordIds ?? []);
  const softPrefer = new Set(preferences.softPreferWordIds ?? []);
  const avoidKeys = new Set(preferences.softAvoidItemKeys ?? []);

  const wordCreatedAt = new Map<string, number>();
  for (const item of items) {
    const wordId = getWordId(item);
    const createdAt = getCreatedAt ? toCreatedAtMs(getCreatedAt(item)) : 0;
    const previous = wordCreatedAt.get(wordId);
    if (previous == null || createdAt > previous) {
      wordCreatedAt.set(wordId, createdAt);
    }
  }

  const wordsByNewest = [...wordCreatedAt.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .map(([wordId]) => wordId);

  const newestPoolSize = Math.min(
    wordsByNewest.length,
    // Keep the newest band focused so the ~80% quota lands on recent vocab,
    // while still leaving spare words for consecutive-section rotation.
    Math.max(Math.ceil(target / Math.max(newestRatio, 0.5)) + 5, 12),
  );
  const newestWords = new Set(wordsByNewest.slice(0, newestPoolSize));
  const newestQuota = Math.min(
    target,
    Math.max(0, Math.ceil(target * newestRatio)),
  );

  const newestNotAvoid = rankWithinPool(
    items.filter(
      (item) =>
        newestWords.has(getWordId(item)) && !softAvoid.has(getWordId(item)),
    ),
    getWordId,
    getItemKey,
    softPrefer,
    avoidKeys,
  );
  const olderNotAvoid = rankWithinPool(
    items.filter(
      (item) =>
        !newestWords.has(getWordId(item)) && !softAvoid.has(getWordId(item)),
    ),
    getWordId,
    getItemKey,
    softPrefer,
    avoidKeys,
  );
  const newestAvoid = rankWithinPool(
    items.filter(
      (item) =>
        newestWords.has(getWordId(item)) && softAvoid.has(getWordId(item)),
    ),
    getWordId,
    getItemKey,
    softPrefer,
    avoidKeys,
  );
  const olderAvoid = rankWithinPool(
    items.filter(
      (item) =>
        !newestWords.has(getWordId(item)) && softAvoid.has(getWordId(item)),
    ),
    getWordId,
    getItemKey,
    softPrefer,
    avoidKeys,
  );

  const selected: T[] = [];
  const usedWords = new Set<string>();
  const usedKeys = new Set<string>();

  const itemIdentity = (item: T, index: number) => {
    const key = getItemKey?.(item);
    return key ?? `${getWordId(item)}::${index}`;
  };

  const takeFrom = (pool: T[], limit: number) => {
    for (let index = 0; index < pool.length; index += 1) {
      if (selected.length >= target || selected.length >= limit) return;
      const item = pool[index]!;
      const wordId = getWordId(item);
      if (usedWords.has(wordId)) continue;
      const identity = itemIdentity(item, index);
      if (usedKeys.has(identity)) continue;
      usedWords.add(wordId);
      usedKeys.add(identity);
      selected.push(item);
    }
  };

  // 1–2: fill newest quota from non-avoided, then avoided newest if needed
  takeFrom(newestNotAvoid, newestQuota);
  if (selected.length < newestQuota) {
    takeFrom(newestAvoid, newestQuota);
  }

  // 3–4: broaden to older, then any remaining avoided words
  takeFrom(olderNotAvoid, target);
  takeFrom(newestNotAvoid, target);
  takeFrom(olderAvoid, target);
  takeFrom(newestAvoid, target);

  // Tiny banks / multi-item words: allow word reuse rather than failing
  if (selected.length < target) {
    const fallbackPools = [
      newestNotAvoid,
      olderNotAvoid,
      newestAvoid,
      olderAvoid,
    ];
    for (const pool of fallbackPools) {
      for (let index = 0; index < pool.length; index += 1) {
        if (selected.length >= target) break;
        const item = pool[index]!;
        const identity = itemIdentity(item, index);
        if (usedKeys.has(identity)) continue;
        usedKeys.add(identity);
        selected.push(item);
      }
    }
  }

  return shuffleArray(selected);
}

export function sampleSessionItems<T>(
  items: T[],
  mode: ExerciseSessionMode,
  preferences?: SessionSamplePreferences<T>,
): T[] {
  if (items.length === 0) return [];
  const range = SESSION_SIZE_RANGE_BY_MODE[mode];
  const size = range
    ? pickSessionSizeInRange(items.length, range.min, range.max)
    : pickSessionSize(items.length, SESSION_SIZE_MAX_BY_MODE[mode]);

  if (!preferences) {
    return shuffleArray(items).slice(0, size);
  }

  return sampleItemsWithPreferences(items, size, preferences);
}
