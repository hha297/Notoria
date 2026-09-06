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

export function sampleSessionItems<T>(
  items: T[],
  mode: ExerciseSessionMode,
): T[] {
  if (items.length === 0) return [];
  const range = SESSION_SIZE_RANGE_BY_MODE[mode];
  const size = range
    ? pickSessionSizeInRange(items.length, range.min, range.max)
    : pickSessionSize(items.length, SESSION_SIZE_MAX_BY_MODE[mode]);
  return shuffleArray(items).slice(0, size);
}
