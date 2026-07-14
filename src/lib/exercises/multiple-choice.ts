import type { FlashcardWord } from "@/types/flashcards";
import {
  buildMixedDirections,
  pickDistractors,
  primaryMeaning,
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
): MultipleChoiceQuestion | null {
  const correct =
    direction === "WORD_TO_MEANING"
      ? primaryMeaning(word.meanings, "")
      : word.word;

  if (!correct) return null;

  const pool =
    direction === "WORD_TO_MEANING"
      ? allWords
          .map((item) => primaryMeaning(item.meanings, ""))
          .filter(Boolean)
      : allWords.map((item) => item.word);

  const distractors = pickDistractors(pool, correct, OPTION_COUNT - 1);
  const options = shuffleArray([correct, ...distractors]);

  if (options.length < 2) return null;

  return {
    id: `${word.id}-${direction}`,
    wordId: word.id,
    direction,
    prompt:
      direction === "WORD_TO_MEANING"
        ? word.word
        : primaryMeaning(word.meanings),
    options,
    correctOption: correct,
  };
}

export function buildMultipleChoiceQuestions(
  words: FlashcardWord[],
  studyMode: "word-to-meaning" | "meaning-to-word" | "mixed",
): MultipleChoiceQuestion[] {
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

    const question = buildQuestion(word, direction, words);
    if (question) questions.push(question);
  }

  return shuffleArray(questions);
}
