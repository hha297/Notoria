/**
 * How questions are shown during a set — independent of exercise type.
 * "One-try" is an answering rule, not a display mode, so it is not used here.
 */

export type ExerciseDisplayMode = "one_by_one" | "all_questions";

/** Default for users who have never chosen — keep the familiar full-set flow. */
export const DEFAULT_EXERCISE_DISPLAY_MODE: ExerciseDisplayMode = "all_questions";

export const EXERCISE_DISPLAY_MODE_STORAGE_KEY =
  "notoria.exercise.displayMode";

export function parseExerciseDisplayMode(
  value: string | null | undefined,
): ExerciseDisplayMode {
  if (value === "one_by_one" || value === "all_questions") return value;
  return DEFAULT_EXERCISE_DISPLAY_MODE;
}

export function isExerciseDisplayMode(
  value: unknown,
): value is ExerciseDisplayMode {
  return value === "one_by_one" || value === "all_questions";
}
