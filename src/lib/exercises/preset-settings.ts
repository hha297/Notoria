import {
  parseExerciseDifficulty,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";

export type ExercisePresetSettings = {
  difficulty?: ExerciseDifficulty;
};

export function normalizePresetSettings(
  value: unknown,
): ExercisePresetSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const settings: ExercisePresetSettings = {};
  if (typeof raw.difficulty === "string") {
    settings.difficulty = parseExerciseDifficulty(raw.difficulty, "medium");
  }
  return settings;
}

export function serializePresetSettings(
  settings: ExercisePresetSettings | null | undefined,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (settings?.difficulty) next.difficulty = settings.difficulty;
  return next;
}

export function presetSettingsEqual(
  left: ExercisePresetSettings | null | undefined,
  right: ExercisePresetSettings | null | undefined,
) {
  return (
    JSON.stringify(serializePresetSettings(left)) ===
    JSON.stringify(serializePresetSettings(right))
  );
}
