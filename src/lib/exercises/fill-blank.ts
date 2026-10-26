import type { FlashcardWord } from "@/types/flashcards";
import { surfaceAnswersForBlank } from "@/lib/exercises/lexical-surface";
import { normalizeAnswer } from "@/lib/exercises/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type FillBlankItem = {
  id: string;
  wordId: string;
  word: string;
  meanings: string[];
  /** Non-empty vocabulary meaning cue shown next to the blank (AI items). */
  meaningHint?: string;
  sentenceBefore: string;
  sentenceAfter: string;
  acceptableAnswers: string[];
  aiGenerated?: boolean;
  /** Learner-facing task line (AI or UI fallback). */
  instruction?: string;
  /** Whole-sentence meaning in the website UI language (shown after answer). */
  sentenceMeaning?: string;
  /** Pre-generated progressive hints. Empty means the stage may build a grounded fallback. */
  hints?: string[];
};

export type FillBlankSource = "saved-examples" | "ai-generated";

export function buildFillBlankAcceptableAnswers(
  word: string,
  matchedWord: string,
) {
  return surfaceAnswersForBlank(word, matchedWord);
}

export function expectedFillBlankAnswer(item: FillBlankItem) {
  return item.acceptableAnswers[0]?.trim() || item.word;
}

function normalizeExampleSentence(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function wholeTokenRegex(form: string, flags: string) {
  return new RegExp(
    `(^|[^\\p{L}\\p{M}])(${escapeRegExp(form)})(?=[^\\p{L}\\p{M}]|$)`,
    flags.includes("u") ? flags : `${flags}u`,
  );
}

function countWholeTokens(haystack: string, needle: string): number {
  const value = needle.trim();
  if (!value) return 0;
  return [...haystack.matchAll(wholeTokenRegex(value, "giu"))].length;
}

function matchUniqueWholeToken(
  haystack: string,
  needle: string,
): { matched: string; start: number } | null {
  const value = needle.trim().replace(/\s+/g, " ");
  if (!value) return null;
  if (countWholeTokens(haystack, value) !== 1) return null;
  const match =
    wholeTokenRegex(value, "u").exec(haystack) ??
    wholeTokenRegex(value, "iu").exec(haystack);
  if (!match || match.index === undefined || match[2] == null) return null;
  const prefix = match[1] ?? "";
  return {
    matched: match[2],
    start: match.index + prefix.length,
  };
}

function letterTokens(text: string): string[] {
  return text.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
}

/**
 * Accept only exact matches or clear prefix/suffix morphology.
 * Rejects mid-substring false friends (e.g. lemma "cat" in "category").
 */
function isTrustedSurfaceForm(lemma: string, token: string): boolean {
  const base = normalizeAnswer(lemma);
  const form = normalizeAnswer(token);
  if (!base || !form) return false;
  if (base === form) return true;

  const maxExtra = Math.max(4, Math.ceil(base.length * 0.75));
  if (form.startsWith(base)) {
    return form.length - base.length <= maxExtra && form.length >= Math.min(base.length, 3);
  }
  if (base.startsWith(form)) {
    return form.length >= Math.min(base.length, 3);
  }
  if (form.endsWith(base)) {
    return form.length - base.length <= maxExtra;
  }
  return false;
}

function splitAtMatch(
  sentence: string,
  matched: string,
  start: number,
): { before: string; matched: string; after: string } {
  return {
    before: sentence.slice(0, start),
    matched,
    after: sentence.slice(start + matched.length),
  };
}

/**
 * Locate a blankable span for a saved vocabulary lemma inside an example.
 * Returns null when the hit is missing, ambiguous, or would blank a substring
 * inside another word.
 */
export function findBlankInExample(
  example: string,
  lemma: string,
): { before: string; matched: string; after: string } | null {
  const sentence = normalizeExampleSentence(example);
  const word = lemma.trim().replace(/\s+/g, " ");
  if (!sentence || !word) return null;

  // Exact multi-word or single-token lemma (unique whole-token / whole-phrase).
  const exact = matchUniqueWholeToken(sentence, word);
  if (exact) {
    return splitAtMatch(sentence, exact.matched, exact.start);
  }

  // Multi-word lemmas without an exact hit are too ambiguous to invent.
  if (word.includes(" ")) return null;

  // Unique trusted inflected / truncated surface form of the lemma.
  const related: string[] = [];
  const seen = new Set<string>();
  for (const token of letterTokens(sentence)) {
    if (!isTrustedSurfaceForm(word, token)) continue;
    const key = normalizeAnswer(token);
    if (seen.has(key)) continue;
    seen.add(key);
    related.push(token);
  }
  if (related.length !== 1) return null;

  const surface = related[0]!;
  if (countWholeTokens(sentence, surface) !== 1) return null;
  const hit = matchUniqueWholeToken(sentence, surface);
  if (!hit) return null;
  return splitAtMatch(sentence, hit.matched, hit.start);
}

/**
 * Build fill-in-the-blank items from saved vocabulary examples only.
 * Skips empty, duplicate, and ambiguous sentences. Never calls AI.
 */
export function buildFillBlankItems(words: FlashcardWord[]): FillBlankItem[] {
  const items: FillBlankItem[] = [];
  const seenSentences = new Set<string>();

  for (const word of words) {
    const lemma = word.word.trim().replace(/\s+/g, " ");
    if (!lemma) continue;

    for (const [index, rawExample] of word.examples.entries()) {
      const example = normalizeExampleSentence(rawExample);
      if (!example) continue;

      const sentenceKey = normalizeAnswer(example);
      if (!sentenceKey || seenSentences.has(sentenceKey)) continue;

      const split = findBlankInExample(example, lemma);
      if (!split) continue;

      seenSentences.add(sentenceKey);
      items.push({
        id: `${word.id}-${index}`,
        wordId: word.id,
        word: lemma,
        meanings: word.meanings,
        meaningHint: word.meanings[0]?.trim() || undefined,
        sentenceBefore: split.before,
        sentenceAfter: split.after,
        acceptableAnswers: buildFillBlankAcceptableAnswers(
          lemma,
          split.matched,
        ),
        aiGenerated: false,
      });
    }
  }

  return items;
}
