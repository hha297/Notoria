import {
  FILL_BLANK_PLACEHOLDER,
  type ExerciseAiFillBlank,
  type ExerciseAiFillBlankDraft,
  type ExerciseAiWordInput,
} from "@/lib/exercises/ai-types";
import {
  normalizePromptBlank,
  resolveValidBlankMeaningHint,
} from "@/lib/exercises/blank-hint";
import {
  acceptResolvedSurfaceForm,
  isRelatedWordForm,
  resolveContextualFromCompleteSentence,
} from "@/lib/exercises/lexical-surface";
import {
  buildFillBlankAcceptableAnswers,
  type FillBlankItem,
} from "@/lib/exercises/fill-blank";
import { normalizeAnswer } from "@/lib/exercises/utils";
import { resolveProgressiveHints } from "@/lib/exercises/progressive-hints";

export { FILL_BLANK_PLACEHOLDER, isRelatedWordForm };

function completeSentenceSource(draft: {
  completeSentence?: string | null;
  sentence?: string | null;
  answer?: string | null;
}) {
  const complete = draft.completeSentence?.trim() ?? "";
  if (complete) return complete;
  // Legacy blank-first drafts: rebuild a complete sentence only when the blank
  // can be filled uniquely with the proposed answer.
  const blanked = draft.sentence?.trim() ?? "";
  const answer = draft.answer?.trim() ?? "";
  if (!blanked || !answer || countFillBlanks(blanked) !== 1) return "";
  return normalizePromptBlank(blanked).replace(FILL_BLANK_PLACEHOLDER, answer);
}

function blankRegex(global = false) {
  return global ? /_{3,}/g : /_{3,}/;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function countFillBlanks(sentence: string) {
  return sentence.match(blankRegex(true))?.length ?? 0;
}

export function splitSentenceAtBlank(sentence: string) {
  if (countFillBlanks(sentence) !== 1) return null;
  const match = blankRegex().exec(sentence);
  if (!match || match.index === undefined) return null;
  return {
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
  };
}

function containsWholeWord(haystack: string, needle: string) {
  const value = needle.trim();
  if (!value) return false;
  const regex = new RegExp(
    `(^|[^\\p{L}\\p{M}])${escapeRegExp(value)}([^\\p{L}\\p{M}]|$)`,
    "iu",
  );
  return regex.test(haystack);
}

export function sentenceLeaksAnswer(sentence: string, ...candidates: string[]) {
  const withoutBlank = sentence.replace(blankRegex(true), " ");
  return candidates.some((candidate) =>
    containsWholeWord(withoutBlank, candidate),
  );
}

function normalizeSentence(value: string) {
  return value
    .replace(blankRegex(true), " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isDuplicateAvoidedSentence(
  sentence: string,
  answer: string,
  avoidSentences: string[] = [],
) {
  const filled = normalizeSentence(sentence.replace(blankRegex(true), answer));
  const blanked = normalizeSentence(sentence);
  return avoidSentences.some((example) => {
    const normalized = normalizeSentence(example);
    return normalized === filled || normalized === blanked;
  });
}

export function validateFillBlankExercise(
  raw: ExerciseAiFillBlankDraft,
  word: ExerciseAiWordInput,
): ExerciseAiFillBlank | null {
  const lemma = word.word.trim();
  const proposed = raw.answer?.trim() ?? "";
  if (!lemma) return null;

  // Prefer complete-then-blank: extract the exact token from the complete
  // sentence so blank-first morphology guesses cannot pass validation.
  const completeSentence = completeSentenceSource(raw);
  const fromComplete = completeSentence
    ? resolveContextualFromCompleteSentence({
        completeSentence,
        lemma,
        proposed: proposed || undefined,
      }) ??
      resolveContextualFromCompleteSentence({
        completeSentence,
        lemma: raw.baseWord?.trim() || lemma,
        proposed: proposed || undefined,
      })
    : null;

  let sentence: string;
  let answer: string;

  if (fromComplete) {
    sentence = normalizePromptBlank(fromComplete.prompt);
    answer = fromComplete.answerForm;
  } else {
    sentence = normalizePromptBlank(raw.sentence?.trim() ?? "");
    if (!sentence || !proposed) return null;
    if (countFillBlanks(sentence) !== 1) return null;
    if (!splitSentenceAtBlank(sentence)) return null;

    const resolved =
      acceptResolvedSurfaceForm({
        prompt: sentence,
        lemma,
        proposed,
      }) ??
      acceptResolvedSurfaceForm({
        prompt: sentence,
        lemma: raw.baseWord?.trim() || lemma,
        proposed,
      });
    if (!resolved) return null;
    answer = resolved;
  }

  if (!sentence || !answer) return null;
  if (countFillBlanks(sentence) !== 1) return null;
  if (!splitSentenceAtBlank(sentence)) return null;

  // When both completeSentence and a blanked sentence were provided, they must
  // describe the same item (same blank slot after normalization).
  const blankedRaw = raw.sentence?.trim()
    ? normalizePromptBlank(raw.sentence.trim())
    : "";
  if (
    blankedRaw &&
    countFillBlanks(blankedRaw) === 1 &&
    normalizeSentence(blankedRaw) !== normalizeSentence(sentence)
  ) {
    return null;
  }

  if (sentenceLeaksAnswer(sentence, answer, lemma, raw.baseWord ?? "")) {
    return null;
  }
  if (isDuplicateAvoidedSentence(sentence, answer, word.avoidSentences)) {
    return null;
  }
  if (
    !resolveValidBlankMeaningHint({
      meaning: word.meaning,
      answer,
      baseWord: lemma,
    })
  ) {
    return null;
  }

  const hints = Array.isArray(raw.hints)
    ? raw.hints
        .map((hint) => (typeof hint === "string" ? hint.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    : undefined;

  return {
    wordId: word.id,
    type: "fill-in-blank",
    completeSentence: null,
    sentence,
    answer,
    baseWord: lemma,
    language: raw.language ?? null,
    instruction: raw.instruction?.trim() || null,
    explanation: null,
    difficulty: raw.difficulty ?? null,
    sentenceMeaning: raw.sentenceMeaning?.trim() || null,
    ...(hints && hints.length > 0 ? { hints } : {}),
  };
}

export function matchExerciseWord(
  exercise: { wordId?: string; answer: string; baseWord?: string | null },
  remaining: ExerciseAiWordInput[],
) {
  const byId = remaining.find((word) => word.id === exercise.wordId);
  if (byId) return byId;

  const answer = normalizeAnswer(exercise.answer);
  const base = normalizeAnswer(exercise.baseWord ?? "");

  return remaining.find((word) => {
    const target = normalizeAnswer(word.word);
    return (
      target === base ||
      target === answer ||
      isRelatedWordForm(word.word, exercise.answer) ||
      isRelatedWordForm(word.word, exercise.baseWord ?? "")
    );
  });
}

export function selectValidFillBlankExercises(
  exercises: ExerciseAiFillBlankDraft[],
  words: ExerciseAiWordInput[],
) {
  const valid: ExerciseAiFillBlank[] = [];
  const seenSentences = new Set<string>();
  const unused = [...words];

  for (const exercise of exercises) {
    const word =
      unused.find((item) => item.id === exercise.wordId) ??
      matchExerciseWord(exercise, unused.length > 0 ? unused : words);
    if (!word) continue;
    const validated = validateFillBlankExercise(exercise, word);
    if (!validated) continue;
    const key = normalizeSentence(validated.sentence);
    if (seenSentences.has(key)) continue;
    seenSentences.add(key);
    valid.push(validated);
    const index = unused.indexOf(word);
    if (index >= 0) unused.splice(index, 1);
  }

  return valid;
}

export function fillBlankExerciseToItem(
  exercise: ExerciseAiFillBlankDraft,
  word: ExerciseAiWordInput & { meanings: string[] },
  suffix: string,
): FillBlankItem | null {
  const sentence = normalizePromptBlank(exercise.sentence);
  const split = splitSentenceAtBlank(sentence);
  if (!split) return null;

  const answer = exercise.answer.trim();
  const meaningHint = resolveValidBlankMeaningHint({
    meanings: word.meanings,
    meaning: word.meaning,
    answer,
    baseWord: word.word,
  });
  if (!meaningHint) return null;

  return {
    id: `${word.id}-ai-${suffix}`,
    wordId: word.id,
    word: word.word,
    meanings:
      word.meanings.map((item) => item.trim()).filter(Boolean).length > 0
        ? word.meanings
        : [meaningHint],
    meaningHint,
    sentenceBefore: split.before,
    sentenceAfter: split.after,
    acceptableAnswers: buildFillBlankAcceptableAnswers(word.word, answer),
    aiGenerated: true,
    instruction: exercise.instruction?.trim() || undefined,
    sentenceMeaning: exercise.sentenceMeaning?.trim() || undefined,
    hints: resolveProgressiveHints({
      raw: exercise.hints,
      answers: [answer, word.word],
      grounding: meaningHint,
      difficulty: exercise.difficulty,
      mode: "spelling-progressive",
      strategy: "grammar-form",
      visibleMeaning: meaningHint,
      spellingAnswer: answer,
      lemma: word.word,
      partOfSpeech: word.partOfSpeech,
    }),
  };
}

export function fillBlankItemSentence(item: FillBlankItem) {
  return `${item.sentenceBefore}${item.acceptableAnswers[0] ?? item.word}${item.sentenceAfter}`.trim();
}
