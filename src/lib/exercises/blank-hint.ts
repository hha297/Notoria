import { normalizeAnswer, normalizeMeaningKey } from "@/lib/exercises/utils";

/** Canonical blank token used in generated study-language sentences. */
export const CONTEXTUAL_PROMPT_BLANK = "________";

/**
 * Shared blank / meaning-hint helpers for AI-generated vocabulary questions.
 * The cue is always a meaning gloss from the target word — never invented copy.
 */

/** Collapse any underscore run of 3+ into the canonical blank. */
export function normalizePromptBlank(prompt: string): string {
  return prompt.replace(/_{3,}/g, CONTEXTUAL_PROMPT_BLANK);
}

export function promptHasBlank(prompt: string): boolean {
  return /_{3,}/.test(prompt);
}

/** Split a prompt around the canonical blank, preserving surrounding spacing. */
export function splitPromptAtBlank(
  prompt: string,
): { before: string; after: string } | null {
  const normalized = normalizePromptBlank(prompt);
  const index = normalized.indexOf(CONTEXTUAL_PROMPT_BLANK);
  if (index < 0) return null;
  return {
    before: normalized.slice(0, index),
    after: normalized.slice(index + CONTEXTUAL_PROMPT_BLANK.length),
  };
}

/** Capitalize only when the blank starts a sentence; otherwise lowercase the lead letter. */
export function applyAnswerFormCasing(
  prompt: string,
  answerForm: string,
): string {
  const form = answerForm.trim();
  if (!form) return form;

  const normalized = normalizePromptBlank(prompt);
  const blankIndex = normalized.indexOf(CONTEXTUAL_PROMPT_BLANK);
  if (blankIndex < 0) return form;

  const prefix = normalized.slice(0, blankIndex);
  const atSentenceStart =
    prefix.trim().length === 0 ||
    /[.!?…]\s*$/u.test(prefix) ||
    /\n\s*$/u.test(prefix);

  if (atSentenceStart) {
    return form.charAt(0).toLocaleUpperCase() + form.slice(1);
  }
  return form.charAt(0).toLocaleLowerCase() + form.slice(1);
}

export function isNonEmptyHint(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** First non-empty trimmed string from meaning sources (arrays or scalars). */
export function resolveBlankMeaningHint(
  ...sources: Array<
    string | null | undefined | readonly (string | null | undefined)[]
  >
): string | null {
  for (const source of sources) {
    if (source == null) continue;
    if (Array.isArray(source)) {
      for (const item of source) {
        if (typeof item !== "string") continue;
        const trimmed = item.trim();
        if (trimmed) return trimmed;
      }
      continue;
    }
    if (typeof source === "string") {
      const trimmed = source.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

export function wordHasBlankMeaningHint(word: {
  meanings?: readonly (string | null | undefined)[];
  meaning?: string | null;
}): boolean {
  return resolveBlankMeaningHint(word.meanings, word.meaning) != null;
}

/**
 * Hint must be a real meaning for the target word and must not duplicate the
 * blank fill / base form (that would spoil the question).
 */
export function isBlankMeaningHintConsistent(params: {
  hint: string;
  answer: string;
  baseWord?: string | null;
  /** When provided, hint must match one of these meanings (case-insensitive). */
  wordMeanings?: readonly (string | null | undefined)[];
}): boolean {
  const hint = params.hint.trim();
  if (!hint) return false;

  const hintKey = normalizeMeaningKey(hint);
  const answerKey = normalizeAnswer(params.answer);
  const baseKey = params.baseWord ? normalizeAnswer(params.baseWord) : "";

  if (hintKey === answerKey) return false;
  if (baseKey && hintKey === baseKey) return false;

  const owned = (params.wordMeanings ?? [])
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  if (owned.length > 0) {
    const matches = owned.some(
      (meaning) => normalizeMeaningKey(meaning) === hintKey,
    );
    if (!matches) return false;
  }

  return true;
}

/** Resolve + validate a blank meaning hint for a vocabulary target. */
export function resolveValidBlankMeaningHint(params: {
  meanings?: readonly (string | null | undefined)[];
  meaning?: string | null;
  answer: string;
  baseWord?: string | null;
}): string | null {
  const hint = resolveBlankMeaningHint(params.meanings, params.meaning);
  if (!hint) return null;
  if (
    !isBlankMeaningHintConsistent({
      hint,
      answer: params.answer,
      baseWord: params.baseWord,
      wordMeanings: params.meanings?.length
        ? params.meanings
        : hint
          ? [hint]
          : [],
    })
  ) {
    return null;
  }
  return hint;
}

/** Inject `(meaning)` next to the blank without duplicating an existing cue. */
export function withBlankMeaningHint(prompt: string, hint: string): string {
  const cue = hint.trim();
  const normalized = normalizePromptBlank(prompt);
  if (!cue || !normalized.includes(CONTEXTUAL_PROMPT_BLANK)) return prompt;
  if (normalized.includes(`${CONTEXTUAL_PROMPT_BLANK} (${cue})`)) {
    return normalized;
  }
  return normalized.replace(
    CONTEXTUAL_PROMPT_BLANK,
    `${CONTEXTUAL_PROMPT_BLANK} (${cue})`,
  );
}

/** Prefer a dedicated meaningHint, then fall back to meanings[]. */
export function blankMeaningHintFromItem(item: {
  meaningHint?: string | null;
  meanings?: readonly (string | null | undefined)[];
}): string | null {
  return resolveBlankMeaningHint(item.meaningHint, item.meanings);
}
