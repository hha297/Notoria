import { getLanguageByCode } from "@/lib/languages";

/** Expand the workspace's stored ISO code into an unambiguous model hint. */
export function describeStudyLanguage(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const language = getLanguageByCode(raw.toLowerCase());
  if (!language) return raw;

  return `${language.englishName} (${language.name}; ${language.code})`;
}

/** Language lock shared by Theory and Import exercise generation. */
export function buildLearnerFacingLanguageContract(
  value?: string | null,
): string {
  const language = describeStudyLanguage(value);
  if (!language) {
    return [
      "Infer the studied language from the imported/theory material.",
      "All learner-facing exercise text must use that studied language; never default to English.",
    ].join(" ");
  }

  return [
    `The authoritative study/workspace language is ${language}.`,
    "Write ALL learner-facing exercise fields in that language: prompt, sentence, instruction, options, correctOption, hint, hints, explanation, learningObjective, and skillLabel.",
    "Do not use English merely because this system prompt or the JSON field names are English.",
    "Keep quoted target-language wording from the source exact. If source metadata or task directions are in another language, do not let that change the exercise language.",
  ].join(" ");
}
