import {
  FILL_BLANK_PLACEHOLDER,
  type ExerciseAiFillBlank,
  type ExerciseAiFillBlankDraft,
  type ExerciseAiWordInput,
} from "@/lib/exercises/ai-types";
import {
  buildFillBlankAcceptableAnswers,
  type FillBlankItem,
} from "@/lib/exercises/fill-blank";
import { normalizeAnswer } from "@/lib/exercises/utils";

export { FILL_BLANK_PLACEHOLDER };

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
  return candidates.some((candidate) => containsWholeWord(withoutBlank, candidate));
}

function normalizeSentence(value: string) {
  return value.replace(blankRegex(true), " ").replace(/\s+/g, " ").trim().toLowerCase();
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
  const sentence = raw.sentence.trim();
  const answer = raw.answer.trim();
  const baseWord = (raw.baseWord?.trim() || word.word).trim();

  if (!sentence || !answer) return null;
  if (countFillBlanks(sentence) !== 1) return null;
  if (!splitSentenceAtBlank(sentence)) return null;
  if (!isRelatedWordForm(word.word, answer) && !isRelatedWordForm(baseWord, answer)) {
    return null;
  }
  if (sentenceLeaksAnswer(sentence, answer, word.word, baseWord)) return null;
  if (isDuplicateAvoidedSentence(sentence, answer, word.avoidSentences)) return null;

  return {
    wordId: word.id,
    type: "fill-in-blank",
    sentence,
    answer,
    baseWord: word.word,
    language: raw.language ?? null,
    explanation: null,
    difficulty: raw.difficulty ?? null,
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
  const split = splitSentenceAtBlank(exercise.sentence);
  if (!split) return null;

  return {
    id: `${word.id}-ai-${suffix}`,
    wordId: word.id,
    word: word.word,
    meanings: word.meanings,
    sentenceBefore: split.before,
    sentenceAfter: split.after,
    acceptableAnswers: buildFillBlankAcceptableAnswers(word.word, exercise.answer),
    aiGenerated: true,
  };
}

export function fillBlankItemSentence(item: FillBlankItem) {
  return `${item.sentenceBefore}${item.acceptableAnswers[0] ?? item.word}${item.sentenceAfter}`.trim();
}
