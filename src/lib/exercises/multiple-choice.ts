import type { FlashcardWord } from "@/types/flashcards";
import {
  assignWordMeanings,
  buildMixedDirections,
  isMeaningOwnedByWord,
  normalizeMeaningKey,
  pickDistractors,
  shuffleArray,
  type StudyDirection,
} from "@/lib/exercises/utils";

export type MultipleChoiceQuestion = {
  id: string;
  wordId: string;
  direction: StudyDirection;
  prompt: string;
  options: string[];
  correctOption: string;
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

  if (options.length < 2) return null;

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

export function buildMultipleChoiceQuestions(
  words: FlashcardWord[],
  studyMode: "word-to-meaning" | "meaning-to-word" | "mixed",
): MultipleChoiceQuestion[] {
  const assignments = assignWordMeanings(words);
  const directions =
    studyMode === "mixed"
      ? buildMixedDirections(words.map((word) => word.id))
      : {};

  const questions: MultipleChoiceQuestion[] = [];

  for (const word of words) {
    const direction =
      studyMode === "word-to-meaning"
        ? "WORD_TO_MEANING"
        : studyMode === "meaning-to-word"
          ? "MEANING_TO_WORD"
          : directions[word.id] ?? "WORD_TO_MEANING";

    const question = buildQuestion(word, direction, words, assignments);
    if (question) questions.push(question);
  }

  return shuffleArray(questions);
}
