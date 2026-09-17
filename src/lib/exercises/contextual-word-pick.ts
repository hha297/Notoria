import { shuffleArray } from "@/lib/exercises/utils";

export type ContextualWordPickPreferences = {
  getWordId: (item: { id: string }) => string;
  getWordForm: (item: { word: string }) => string;
  softAvoidWordIds?: Iterable<string>;
  softPreferWordIds?: Iterable<string>;
};

function normalizeForm(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Pick distinct vocabulary for Contextual AI batches.
 * Prefers unused surface forms and soft-prefer misses; spreads across the full
 * pool instead of concentrating on a tiny newest subset. Reuses a form only
 * when the unique pool is smaller than `count`.
 */
export function pickDistinctContextualWords<
  T extends { id: string; word: string },
>(
  words: T[],
  count: number,
  preferences: ContextualWordPickPreferences = {
    getWordId: (item) => item.id,
    getWordForm: (item) => item.word,
  },
): T[] {
  if (words.length === 0 || count <= 0) return [];

  const target = Math.min(count, words.length);
  const softAvoid = new Set(preferences.softAvoidWordIds ?? []);
  const softPrefer = new Set(preferences.softPreferWordIds ?? []);
  const getWordId = preferences.getWordId;
  const getWordForm = preferences.getWordForm;

  const uniqueById = new Map<string, T>();
  for (const word of words) {
    const id = getWordId(word);
    if (!uniqueById.has(id)) uniqueById.set(id, word);
  }
  const pool = [...uniqueById.values()];

  const prefer = shuffleArray(
    pool.filter((word) => softPrefer.has(getWordId(word))),
  );
  const fresh = shuffleArray(
    pool.filter(
      (word) =>
        !softPrefer.has(getWordId(word)) && !softAvoid.has(getWordId(word)),
    ),
  );
  const avoided = shuffleArray(
    pool.filter(
      (word) =>
        softAvoid.has(getWordId(word)) && !softPrefer.has(getWordId(word)),
    ),
  );

  const ranked = [...prefer, ...fresh, ...avoided];
  const selected: T[] = [];
  const usedIds = new Set<string>();
  const usedForms = new Set<string>();

  for (const word of ranked) {
    if (selected.length >= target) break;
    const id = getWordId(word);
    const form = normalizeForm(getWordForm(word));
    if (usedIds.has(id)) continue;
    if (form && usedForms.has(form)) continue;
    usedIds.add(id);
    if (form) usedForms.add(form);
    selected.push(word);
  }

  // Only reuse surface forms when the unique pool is too small for the batch.
  if (selected.length < target) {
    for (const word of ranked) {
      if (selected.length >= target) break;
      const id = getWordId(word);
      if (usedIds.has(id)) continue;
      usedIds.add(id);
      selected.push(word);
    }
  }

  return shuffleArray(selected);
}
