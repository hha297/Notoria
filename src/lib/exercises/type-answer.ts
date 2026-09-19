import type { FlashcardWord } from "@/types/flashcards";
import {
  blankMeaningHintFromItem,
  normalizePromptBlank,
  promptHasBlank,
  resolveValidBlankMeaningHint,
  withBlankMeaningHint,
} from "@/lib/exercises/blank-hint";
import { surfaceAnswersForBlank } from "@/lib/exercises/lexical-surface";
import {
  assignWordMeanings,
  isMeaningOwnedByWord,
  normalizeMeaningKey,
  shuffleArray,
  type StudyDirection,
} from "@/lib/exercises/utils";
import { fillContextualBlank } from "@/lib/exercises/multiple-choice";

export type TypeAnswerStudyMode =
  | "word-to-meaning"
  | "meaning-to-word"
  | "contextual";

export type TypeAnswerItem = {
  id: string;
  wordId: string;
  direction: StudyDirection | "CONTEXTUAL";
  prompt: string;
  acceptableAnswers: string[];
  /** Primary display / reveal form (exact blank fill for Contextual). */
  answerDisplay: string;
  word: string;
  meanings: string[];
  /** Non-empty vocabulary meaning cue next to the Contextual blank. */
  meaningHint?: string;
  aiGenerated?: boolean;
  sentenceMeaning?: string | null;
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

/** Deterministic Word→Meaning / Meaning→Word items only. */
export function buildTypeAnswerItems(
  words: FlashcardWord[],
  studyMode: "word-to-meaning" | "meaning-to-word",
): TypeAnswerItem[] {
  const assignments = assignWordMeanings(words);
  const items: TypeAnswerItem[] = [];

  for (const word of words) {
    const assignedMeaning = assignments.get(word.id);
    if (!assignedMeaning) continue;

    const direction: StudyDirection =
      studyMode === "word-to-meaning" ? "WORD_TO_MEANING" : "MEANING_TO_WORD";

    if (
      direction === "MEANING_TO_WORD" &&
      !isMeaningOwnedByWord(assignedMeaning, word.id, words)
    ) {
      continue;
    }

    const isWordPrompt = direction === "WORD_TO_MEANING";
    const acceptable = buildAnswers(isWordPrompt ? word.meanings : [word.word]);
    const answerDisplay = isWordPrompt ? word.meanings.join(" · ") : word.word;

    items.push({
      id: `${word.id}-${direction}-${normalizeMeaningKey(assignedMeaning)}`,
      wordId: word.id,
      direction,
      prompt: isWordPrompt ? word.word : assignedMeaning,
      acceptableAnswers: acceptable,
      answerDisplay,
      word: word.word,
      meanings: word.meanings,
    });
  }

  return shuffleArray(items);
}

export function contextualExerciseToTypeAnswerItem(
  exercise: {
    wordId: string;
    prompt: string;
    answer: string;
    sentenceMeaning?: string | null;
  },
  word: FlashcardWord | undefined,
  index: number,
): TypeAnswerItem | null {
  const answer = exercise.answer.trim();
  const prompt = normalizePromptBlank(exercise.prompt.trim());
  if (!answer || !prompt) return null;
  if (!promptHasBlank(prompt)) return null;
  if (!word) return null;

  const meaningHint = resolveValidBlankMeaningHint({
    meanings: word.meanings,
    answer,
    baseWord: word.word,
  });
  if (!meaningHint) return null;

  return {
    id: `${exercise.wordId}-contextual-${index}`,
    wordId: exercise.wordId,
    direction: "CONTEXTUAL",
    prompt,
    acceptableAnswers: surfaceAnswersForBlank(word.word, answer),
    answerDisplay: answer,
    word: word.word,
    meanings: word.meanings,
    meaningHint,
    aiGenerated: true,
    sentenceMeaning: exercise.sentenceMeaning,
  };
}

/** Filled sentence for Contextual reveal / feedback. */
export function typeAnswerRevealPrompt(item: TypeAnswerItem): string {
  if (item.direction !== "CONTEXTUAL") return item.prompt;
  const cue = blankMeaningHintFromItem(item);
  if (!promptHasBlank(item.prompt)) {
    return fillContextualBlank(item.prompt, item.answerDisplay);
  }
  const fill = cue ? `${item.answerDisplay} (${cue})` : item.answerDisplay;
  return fillContextualBlank(item.prompt, fill);
}

/** Show vocabulary meaning next to the blank, like Fill in the Blank. */
export function typeAnswerPromptWithMeaningHint(item: TypeAnswerItem): string {
  if (item.direction !== "CONTEXTUAL") return item.prompt;
  const cue = blankMeaningHintFromItem(item);
  if (!cue) return item.prompt;
  return withBlankMeaningHint(item.prompt, cue);
}
