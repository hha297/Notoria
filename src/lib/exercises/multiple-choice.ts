import type { FlashcardWord } from "@/types/flashcards";
import {
  assignWordMeanings,
  isMeaningOwnedByWord,
  normalizeMeaningKey,
  pickDistractors,
  shuffleArray,
  type StudyDirection,
} from "@/lib/exercises/utils";

export type MultipleChoiceStudyMode =
  | "word-to-meaning"
  | "meaning-to-word"
  | "contextual";

export type MultipleChoiceQuestion = {
  id: string;
  wordId: string;
  direction: StudyDirection | "CONTEXTUAL";
  prompt: string;
  options: string[];
  correctOption: string;
  /** Exact grammatical form inserted into the blank when revealed (Contextual). */
  answerForm?: string;
  /** Saved vocabulary / base form (Contextual). */
  baseWord?: string;
  aiGenerated?: boolean;
  sentenceMeaning?: string | null;
};

const OPTION_COUNT = 4;

function buildQuestion(
  word: FlashcardWord,
  direction: StudyDirection,
  allWords: FlashcardWord[],
  assignments: Map<string, string>,
): MultipleChoiceQuestion | null {
  const assignedMeaning = assignments.get(word.id);
  if (!assignedMeaning) return null;

  if (
    direction === "MEANING_TO_WORD" &&
    !isMeaningOwnedByWord(assignedMeaning, word.id, allWords)
  ) {
    return null;
  }

  const correct =
    direction === "WORD_TO_MEANING" ? assignedMeaning : word.word;

  const pool =
    direction === "WORD_TO_MEANING"
      ? allWords
          .filter((item) => item.id !== word.id)
          .map((item) => assignments.get(item.id) ?? "")
          .filter(Boolean)
      : allWords
          .filter((item) => item.id !== word.id)
          .map((item) => item.word);

  const equals =
    direction === "WORD_TO_MEANING"
      ? (a: string, b: string) => normalizeMeaningKey(a) === normalizeMeaningKey(b)
      : undefined;

  const distractors = pickDistractors(pool, correct, OPTION_COUNT - 1, equals);
  const options = shuffleArray([correct, ...distractors]);

  if (options.length !== OPTION_COUNT) return null;

  return {
    id: `${word.id}-${direction}-${normalizeMeaningKey(assignedMeaning)}`,
    wordId: word.id,
    direction,
    prompt:
      direction === "WORD_TO_MEANING" ? word.word : assignedMeaning,
    options,
    correctOption: correct,
  };
}

/** Deterministic Word→Meaning / Meaning→Word questions only. */
export function buildMultipleChoiceQuestions(
  words: FlashcardWord[],
  studyMode: "word-to-meaning" | "meaning-to-word",
): MultipleChoiceQuestion[] {
  const assignments = assignWordMeanings(words);
  const questions: MultipleChoiceQuestion[] = [];

  for (const word of words) {
    const direction: StudyDirection =
      studyMode === "word-to-meaning" ? "WORD_TO_MEANING" : "MEANING_TO_WORD";

    const question = buildQuestion(word, direction, words, assignments);
    if (question) questions.push(question);
  }

  return shuffleArray(questions);
}

export function contextualExerciseToQuestion(
  exercise: {
    wordId: string;
    prompt: string;
    options: string[];
    correctOption: string;
    baseWord?: string | null;
    answerForm?: string | null;
    sentenceMeaning?: string | null;
  },
  index: number,
): MultipleChoiceQuestion | null {
  if (exercise.options.length !== OPTION_COUNT) return null;
  if (
    !exercise.options.some(
      (option) =>
        normalizeMeaningKey(option) === normalizeMeaningKey(exercise.correctOption),
    )
  ) {
    return null;
  }

  const answerForm = exercise.answerForm?.trim()
    ? exercise.answerForm.trim()
    : exercise.correctOption;
  return {
    id: `${exercise.wordId}-contextual-${index}`,
    wordId: exercise.wordId,
    direction: "CONTEXTUAL",
    prompt: exercise.prompt,
    options: exercise.options,
    correctOption: exercise.correctOption,
    baseWord: exercise.baseWord?.trim() || exercise.correctOption,
    answerForm,
    aiGenerated: true,
    sentenceMeaning: exercise.sentenceMeaning,
  };
}

/** Replace the contextual blank with the grammatical answer form. */
export function fillContextualBlank(prompt: string, answerForm: string): string {
  const form = applyAnswerFormCasing(prompt, answerForm);
  if (prompt.includes("________")) {
    return prompt.replace("________", form);
  }
  return prompt;
}

/** Capitalize only when the blank starts a sentence; otherwise lowercase the lead letter. */
export function applyAnswerFormCasing(prompt: string, answerForm: string): string {
  const form = answerForm.trim();
  if (!form) return form;

  const blankIndex = prompt.indexOf("________");
  if (blankIndex < 0) return form;

  const prefix = prompt.slice(0, blankIndex);
  const atSentenceStart =
    prefix.trim().length === 0 || /[.!?…]\s*$/u.test(prefix) || /\n\s*$/u.test(prefix);

  if (atSentenceStart) {
    return form.charAt(0).toLocaleUpperCase() + form.slice(1);
  }
  return form.charAt(0).toLocaleLowerCase() + form.slice(1);
}
