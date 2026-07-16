import type { FlashcardWord } from "@/types/flashcards";
import type { FlashcardStudyMode } from "@/types/flashcards";
import {
  assignWordMeanings,
  buildMixedDirections,
  isMeaningOwnedByWord,
  normalizeMeaningKey,
  shuffleArray,
  type StudyDirection,
} from "@/lib/exercises/utils";

export type TypeAnswerItem = {
  id: string;
  wordId: string;
  direction: StudyDirection;
  prompt: string;
  acceptableAnswers: string[];
  word: string;
  meanings: string[];
};

function buildAnswers(values: string[]) {
  const answers = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    answers.add(trimmed);
    answers.add(trimmed.toLowerCase());
  }
  return [...answers];
}

export function buildTypeAnswerItems(
  words: FlashcardWord[],
  studyMode: FlashcardStudyMode,
): TypeAnswerItem[] {
  const assignments = assignWordMeanings(words);
  const directions =
    studyMode === "mixed"
      ? buildMixedDirections(words.map((word) => word.id))
      : {};

  const items: TypeAnswerItem[] = [];

  for (const word of words) {
    const assignedMeaning = assignments.get(word.id);
    if (!assignedMeaning) continue;

    const direction: StudyDirection =
      studyMode === "word-to-meaning"
        ? "WORD_TO_MEANING"
        : studyMode === "meaning-to-word"
          ? "MEANING_TO_WORD"
          : directions[word.id] ?? "WORD_TO_MEANING";

    if (
      direction === "MEANING_TO_WORD" &&
      !isMeaningOwnedByWord(assignedMeaning, word.id, words)
    ) {
      continue;
    }

    const isWordPrompt = direction === "WORD_TO_MEANING";

    items.push({
      id: `${word.id}-${direction}-${normalizeMeaningKey(assignedMeaning)}`,
      wordId: word.id,
      direction,
      prompt: isWordPrompt ? word.word : assignedMeaning,
      acceptableAnswers: buildAnswers(
        isWordPrompt ? word.meanings : [word.word],
      ),
      word: word.word,
      meanings: word.meanings,
    });
  }

  return shuffleArray(items);
}
