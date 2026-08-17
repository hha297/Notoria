import type { ExerciseAiWordInput } from "@/lib/exercises/ai-types";
import { FILL_BLANK_AI_BATCH } from "@/lib/exercises/ai-types";
import { shuffleArray } from "@/lib/exercises/utils";
import type { FlashcardWord } from "@/types/flashcards";

export function pickFillBlankAiWords(
  words: FlashcardWord[],
  count = FILL_BLANK_AI_BATCH,
  recentlyUsedIds: string[] = [],
) {
  if (words.length === 0 || count <= 0) return [];

  const recent = new Set(recentlyUsedIds);
  const unused = shuffleArray(words.filter((word) => !recent.has(word.id)));
  const used = shuffleArray(words.filter((word) => recent.has(word.id)));
  const ordered = unused.length > 0 ? [...unused, ...used] : shuffleArray(words);

  const picked: FlashcardWord[] = [];
  for (let index = 0; picked.length < count; index += 1) {
    picked.push(ordered[index % ordered.length]!);
  }
  return picked;
}

export function toExerciseAiWord(
  word: FlashcardWord,
  extraAvoid: string[] = [],
): ExerciseAiWordInput {
  const avoid = [...word.examples, ...extraAvoid]
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const unique = [...new Set(avoid)].slice(0, 12);

  return {
    id: word.id,
    word: word.word,
    meaning: word.meanings[0]?.trim() || null,
    partOfSpeech: word.partOfSpeech,
    topic: word.tags[0] ?? null,
    avoidSentences: unique.length > 0 ? unique : undefined,
  };
}
