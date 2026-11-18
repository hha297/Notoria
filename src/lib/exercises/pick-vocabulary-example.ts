import type { FlashcardExample } from "@/types/flashcards";

function normalizeSentence(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export type PickVocabularyExampleOptions = {
  /** Reconstruct the exercise sentence to avoid repeating it as "how to use". */
  excludeSentence?: string | null;
  /** Prefer entries whose sentence contains this lemma (soft preference). */
  lemma?: string | null;
  /**
   * When a non-null string: only examples linked to that sense.
   * Never falls back to unassigned (meaningId null) examples.
   * When omitted: allow all examples (fill-blank / word-level flows).
   */
  meaningId?: string | null;
};

/**
 * Pick one vocabulary example for post-answer review or display.
 * Sense-scoped picks never fall back to word-level (unassigned) examples.
 */
export function pickVocabularyExample(
  entries: FlashcardExample[] | undefined | null,
  options?: PickVocabularyExampleOptions,
): FlashcardExample | null {
  if (!entries?.length) return null;

  const senseId =
    typeof options?.meaningId === "string" && options.meaningId.trim()
      ? options.meaningId.trim()
      : null;
  const senseScoped = senseId != null;

  const usable = entries
    .map((entry) => ({
      sentence: entry.sentence.trim(),
      meaning: entry.meaning?.trim() ? entry.meaning.trim() : null,
      meaningId: entry.meaningId ?? null,
    }))
    .filter((entry) => entry.sentence.length > 0)
    .filter((entry) =>
      senseScoped ? entry.meaningId === senseId : true,
    );

  if (usable.length === 0) return null;

  const excluded = options?.excludeSentence
    ? normalizeSentence(options.excludeSentence)
    : "";
  const distinct = excluded
    ? usable.filter((entry) => normalizeSentence(entry.sentence) !== excluded)
    : usable;

  const pool = distinct.length > 0 ? distinct : usable;

  // If the only available example is the exercise stem itself, only show it
  // when a translation exists (otherwise the learner already saw the sentence).
  if (
    distinct.length === 0 &&
    excluded &&
    pool.length === 1 &&
    !pool[0]?.meaning
  ) {
    return null;
  }

  const lemma = options?.lemma?.trim().toLocaleLowerCase() ?? "";
  if (lemma) {
    const withLemma = pool.find((entry) =>
      entry.sentence.toLocaleLowerCase().includes(lemma),
    );
    if (withLemma) return withLemma;
  }

  const withMeaning = pool.find((entry) => entry.meaning);
  return withMeaning ?? pool[0] ?? null;
}

/** Rebuild a fill-blank stem into a full sentence for exclusion matching. */
export function reconstructFillBlankSentence(parts: {
  before: string;
  answer: string;
  after: string;
}) {
  const before = parts.before ?? "";
  const after = parts.after ?? "";
  const answer = parts.answer.trim();
  const leftGap = before && !/\s$/u.test(before) ? " " : "";
  const rightGap = after && !/^\s/u.test(after) ? " " : "";
  return `${before}${leftGap}${answer}${rightGap}${after}`.trim();
}
