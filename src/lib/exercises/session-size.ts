import { shuffleArray } from "@/lib/exercises/utils";

export type ExerciseSessionMode =
  | "flashcards"
  | "fill_blank"
  | "multiple_choice"
  | "match_pairs"
  | "type_answer";

/** Maximum items (or pairs) per exercise session. */
export const SESSION_SIZE_MAX_BY_MODE: Record<ExerciseSessionMode, number> = {
  flashcards: 30,
  fill_blank: 15,
  multiple_choice: 20,
  match_pairs: 10,
  type_answer: 15,
};

/** Cap session length at the mode maximum; use all items when fewer are available. */
export function pickSessionSize(available: number, max: number): number {
  if (available <= 0) return 0;
  return Math.min(available, max);
}

export function sampleSessionItems<T>(
  items: T[],
  mode: ExerciseSessionMode,
): T[] {
  if (items.length === 0) return [];
  const size = pickSessionSize(items.length, SESSION_SIZE_MAX_BY_MODE[mode]);
  return shuffleArray(items).slice(0, size);
}
