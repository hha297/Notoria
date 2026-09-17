import { normalizeAnswer, normalizeMeaningKey } from "@/lib/exercises/utils";

/**
 * Shared blank / meaning-hint helpers for AI-generated vocabulary questions.
 * The cue is always a meaning gloss from the target word — never invented copy.
 */

export function isNonEmptyHint(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** First non-empty trimmed string from meaning sources (arrays or scalars). */
export function resolveBlankMeaningHint(
  ...sources: Array<string | null | undefined | readonly (string | null | undefined)[]>
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
  if (!cue || !prompt.includes("________")) return prompt;
  if (prompt.includes(`________ (${cue})`)) return prompt;
  return prompt.replace("________", `________ (${cue})`);
}

/** Prefer a dedicated meaningHint, then fall back to meanings[]. */
export function blankMeaningHintFromItem(item: {
  meaningHint?: string | null;
  meanings?: readonly (string | null | undefined)[];
}): string | null {
  return resolveBlankMeaningHint(item.meaningHint, item.meanings);
}
