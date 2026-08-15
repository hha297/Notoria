import { isValidLocale, type AppLocale } from "@/i18n/config";

export const UI_LANGUAGE_NAMES = {
  en: "English",
  fi: "Finnish",
  vi: "Vietnamese",
} as const satisfies Record<AppLocale, string>;

export function asAppLocale(value: string | null | undefined): AppLocale {
  return value && isValidLocale(value) ? value : "en";
}

export function uiLanguageName(locale: AppLocale) {
  return UI_LANGUAGE_NAMES[locale];
}

export function genericSpeakerLabel(locale: AppLocale, id: string) {
  if (locale === "fi") return `Puhuja ${id}`;
  if (locale === "vi") return `Người nói ${id}`;
  return `Speaker ${id}`;
}

export function storedExerciseUiLocale(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const locale = (data as { uiLocale?: unknown }).uiLocale;
  return typeof locale === "string" && locale.length > 0 ? locale : null;
}

export function multipleChoiceNeedsLocaleRefresh(
  exercises: Array<{ type: string; data: unknown }>,
  locale: string,
) {
  const multipleChoice = exercises.filter(
    (exercise) => exercise.type === "MULTIPLE_CHOICE",
  );
  if (multipleChoice.length === 0) return false;

  const stored =
    multipleChoice
      .map((exercise) => storedExerciseUiLocale(exercise.data))
      .find(Boolean) ?? "en";

  return stored !== locale;
}
