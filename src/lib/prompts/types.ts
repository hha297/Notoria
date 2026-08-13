export const PROMPT_TYPES = [
  "greeting",
  "motivation",
  "language",
  "activity",
] as const;

export type PromptType = (typeof PROMPT_TYPES)[number];

export const PROMPT_CATEGORIES = [
  "greeting",
  "motivation",
  "language",
  "vocabulary",
  "writing",
  "theory",
  "exercise",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const TIME_OF_DAY = ["morning", "afternoon", "evening"] as const;

export type TimeOfDay = (typeof TIME_OF_DAY)[number];

export type PromptDefinition = {
  id: string;
  type: PromptType;
  /** i18n key under the `prompts` namespace */
  message: string;
  /** Optional i18n key for the modal heading */
  title?: string;
  requiresWorkspace?: boolean;
  category?: PromptCategory;
  /** Restricts the prompt to a time of day. Omit for anytime. */
  timeOfDay?: TimeOfDay;
  /** Interpolates `{language}` from the active workspace. */
  usesLanguage?: boolean;
};

export type PromptContext = {
  hasWorkspace: boolean;
  languageCode: string | null;
  timeOfDay: TimeOfDay;
};
