import {
  CONTEXTUAL_PROMPT_BLANK,
  applyAnswerFormCasing,
  normalizePromptBlank,
  promptHasBlank,
} from "@/lib/exercises/blank-hint";
import { normalizeAnswer } from "@/lib/exercises/utils";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeTokenRegex(form: string, flags: string) {
  return new RegExp(
    `(^|[^\\p{L}\\p{M}])(${escapeRegExp(form)})(?=[^\\p{L}\\p{M}]|$)`,
    flags.includes("u") ? flags : `${flags}u`,
  );
}

function containsWholeToken(haystack: string, needle: string) {
  const value = needle.trim();
  if (!value) return false;
  return wholeTokenRegex(value, "iu").test(haystack);
}

function letterTokens(text: string): string[] {
  return text.match(/\p{L}[\p{L}\p{M}]*/gu) ?? [];
}

function normalizeSentence(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Shared generation guidance: the saved vocabulary string is a lemma.
 * The sentence decides the surface form. Language-agnostic; no vocabulary examples.
 */
export const LEXICAL_SURFACE_GUIDANCE = `Treat each saved vocabulary string as a lemma (dictionary / base form), not automatically as the token that belongs in the sentence.

The study language may require morphology. Reason from the COMPLETE sentence — do not paste the lemma and do not apply a simplistic "add an ending" rule.

For every item:
1. Understand the target vocabulary's provided meaning and likely lexical category.
2. Write a natural sentence in the study language around that meaning. The target must belong in that sentence semantically — do not bolt it onto an unrelated frame.
3. Determine the grammatical role of the target in that sentence (including agreement and any possessive or person-marking the language requires).
4. Produce the exact surface form that role requires: case, number, tense, person, mood, voice, possession, agreement, irregular morphology, or other context-dependent change.
5. Return that surface form as the blank answer, still tied to the original lemma / wordId. Never overwrite or invent a different lexeme.
6. Do not copy the lemma into the blank, options, or reveal text when the sentence requires a different surface form.
7. If the lemma already fits the slot, return the lemma with the casing the sentence needs.
8. If you cannot confidently build a natural sentence around this target, write a different sentence. Never force the raw saved string into an ungrammatical slot.
9. sentenceMeaning / translation must describe the COMPLETE correct sentence after the surface form is filled in.`;

export const LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE = `Generation order is mandatory and is not optional:
1. Write a COMPLETE, grammatical study-language sentence that already contains the correctly inflected target token. Do not insert a blank yet.
2. That in-sentence token is the only correct answer. It may differ from the saved lemma.
3. Return that exact token as answerForm / answer / correctOption. Never return only the lemma when the sentence used another form.
4. completeSentence must contain no blank and no underscore placeholder. The application replaces that exact token with a blank after validation.
Never write a blanked sentence first and then guess how the lemma should change. The complete sentence decides the form; later code must not inflect it again.`;

export const LEXICAL_SURFACE_MC_GUIDANCE = `Multiple-choice options must be compatible with the SAME blank slot after the used form is removed from the complete sentence.
correctOption MUST equal the exact token taken from completeSentence (answerForm) — not merely the saved lemma.
baseWord remains the saved lemma and must not be changed.
Distractors are other learner words (wrong lexemes). Realize each distractor in a form that could stand in that same grammatical slot, but it must remain a different vocabulary item.
Never mark the lemma as the clickable correct option when the sentence used another surface form.
Never display or revert to the lemma in options, the selected answer, or post-submit review when a different surface form is required.`;

export const LEXICAL_SURFACE_EVALUATOR_GUIDANCE = `The saved vocabulary string is a lemma. The learner may use any grammatically appropriate surface form of that lemma (inflection, conjugation, agreement, possession, or other morphology the study language requires).
Do not mark a sentence wrong only because the surface form differs from the stored lemma.
Do mark it wrong if they used a different lexeme or an ungrammatical form for this sentence.
When explaining errors, refer to the grammatical role in THIS sentence — do not compare the learner's token against the lemma as if the lemma were the only acceptable form.`;

export function isRelatedWordForm(baseWord: string, answer: string) {
  const base = normalizeAnswer(baseWord);
  const form = normalizeAnswer(answer);
  if (!base || !form) return false;
  if (base === form) return true;
  if (form.includes(base) || base.includes(form)) return true;
  const need =
    base.length <= 4
      ? 2
      : Math.max(3, Math.ceil(Math.min(base.length, form.length) * 0.5));
  return base.slice(0, need) === form.slice(0, need);
}

/** Casing variants of the surface form; include the lemma only when it is the same form. */
export function surfaceAnswersForBlank(
  lemma: string,
  surface: string,
): string[] {
  const answers = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    answers.add(trimmed);
    answers.add(trimmed.toLowerCase());
  };
  add(surface);
  if (normalizeAnswer(lemma) === normalizeAnswer(surface)) {
    add(lemma);
  }
  return [...answers];
}

export function filledSentenceUsesForm(prompt: string, form: string): boolean {
  const surface = form.trim();
  if (!surface) return false;
  const normalized = normalizePromptBlank(prompt);
  if (!normalized.includes(CONTEXTUAL_PROMPT_BLANK)) return false;
  const filled = normalized.replace(CONTEXTUAL_PROMPT_BLANK, surface);
  return containsWholeToken(filled, surface);
}

/**
 * Accept a proposed blank fill only when it is a related form of the lemma
 * and actually occupies the blank in the completed sentence.
 */
export function acceptResolvedSurfaceForm(input: {
  prompt: string;
  lemma: string;
  proposed: string;
}): string | null {
  const proposed = input.proposed.trim().replace(/\s+/g, " ");
  if (!proposed || proposed.split(/\s+/).length > 2) return null;
  if (!isRelatedWordForm(input.lemma, proposed)) return null;
  const cased = applyAnswerFormCasing(input.prompt, proposed);
  if (!filledSentenceUsesForm(input.prompt, cased)) return null;
  return cased;
}

export function optionLooksLikeLemma(option: string, lemma: string) {
  return normalizeAnswer(option) === normalizeAnswer(lemma);
}

export function countWholeTokens(haystack: string, needle: string): number {
  const value = needle.trim();
  if (!value) return 0;
  return [...haystack.matchAll(wholeTokenRegex(value, "giu"))].length;
}

function matchUniqueWholeToken(
  haystack: string,
  needle: string,
): string | null {
  const value = needle.trim();
  if (!value) return null;
  if (countWholeTokens(haystack, value) !== 1) return null;
  return wholeTokenRegex(value, "iu").exec(haystack)?.[2] ?? null;
}

/** Skip tiny fragments that happen to sit inside the lemma. */
function isExtractableSurface(lemma: string, token: string) {
  if (!isRelatedWordForm(lemma, token)) return false;
  const base = lemma.trim();
  const form = token.trim();
  if (normalizeAnswer(base) === normalizeAnswer(form)) return true;
  return form.length >= Math.min(base.length, 3);
}

/**
 * Take the exact token used in a complete sentence. Rejects blank-first drafts.
 * Does not inflect: it only finds the token that already appears in the sentence.
 */
export function extractUsedFormFromCompleteSentence(input: {
  completeSentence: string;
  lemma: string;
  proposed?: string;
}): string | null {
  const sentence = normalizeSentence(input.completeSentence);
  const lemma = input.lemma.trim();
  if (!sentence || !lemma || promptHasBlank(sentence)) return null;

  const proposed = input.proposed?.trim().replace(/\s+/g, " ") ?? "";
  if (proposed && proposed.split(/\s+/).length <= 2) {
    const hit = matchUniqueWholeToken(sentence, proposed);
    if (hit && isExtractableSurface(lemma, hit)) return hit;
  }

  const related: string[] = [];
  const seen = new Set<string>();
  for (const token of letterTokens(sentence)) {
    if (!isExtractableSurface(lemma, token)) continue;
    const key = normalizeAnswer(token);
    if (seen.has(key)) continue;
    seen.add(key);
    related.push(token);
  }
  if (related.length !== 1) return null;
  if (countWholeTokens(sentence, related[0]!) !== 1) return null;
  return related[0] ?? null;
}

/** Replace exactly one whole-token occurrence of the used form with the canonical blank. */
export function blankExactUsedForm(
  completeSentence: string,
  form: string,
): { prompt: string; usedForm: string } | null {
  const sentence = normalizeSentence(completeSentence);
  const surface = form.trim();
  if (!sentence || !surface || promptHasBlank(sentence)) return null;

  const match =
    wholeTokenRegex(surface, "u").exec(sentence) ??
    wholeTokenRegex(surface, "iu").exec(sentence);
  if (!match || match.index === undefined || match[2] == null) return null;

  const usedForm = match[2];
  if (countWholeTokens(sentence, usedForm) !== 1) return null;

  const prefix = match[1] ?? "";
  const start = match.index + prefix.length;
  const prompt =
    sentence.slice(0, start) +
    CONTEXTUAL_PROMPT_BLANK +
    sentence.slice(start + usedForm.length);

  if (!promptHasBlank(prompt)) return null;
  if (containsWholeToken(prompt.replace(/_{3,}/g, " "), usedForm)) return null;
  return { prompt, usedForm };
}

/**
 * Complete sentence → extract used form → blank that exact token.
 * The returned answerForm is the extracted token, not a later inflection.
 */
export function resolveContextualFromCompleteSentence(input: {
  completeSentence: string;
  lemma: string;
  proposed?: string;
}): { prompt: string; answerForm: string } | null {
  const used = extractUsedFormFromCompleteSentence(input);
  if (!used) return null;
  const blanked = blankExactUsedForm(input.completeSentence, used);
  if (!blanked) return null;
  return {
    prompt: blanked.prompt,
    answerForm: applyAnswerFormCasing(blanked.prompt, blanked.usedForm),
  };
}
