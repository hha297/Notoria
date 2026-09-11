import type { ExerciseAiWordInput } from "@/lib/exercises/ai-types";
import { FILL_BLANK_AI_BATCH } from "@/lib/exercises/ai-types";
import {
  sampleItemsWithPreferences,
  type SessionSamplePreferences,
} from "@/lib/exercises/session-size";
import type { FlashcardWord } from "@/types/flashcards";

export type PickFillBlankAiWordsOptions = Pick<
  SessionSamplePreferences<FlashcardWord>,
  "softAvoidWordIds" | "softPreferWordIds"
> & {
  /** Previously used word ids this page session (soft rotation). */
  recentlyUsedIds?: string[];
};

export function pickFillBlankAiWords(
  words: FlashcardWord[],
  count = FILL_BLANK_AI_BATCH,
  recentlyUsedIdsOrOptions: string[] | PickFillBlankAiWordsOptions = [],
) {
  if (words.length === 0 || count <= 0) return [];

  const options: PickFillBlankAiWordsOptions = Array.isArray(
    recentlyUsedIdsOrOptions,
  )
    ? { recentlyUsedIds: recentlyUsedIdsOrOptions }
    : recentlyUsedIdsOrOptions;

  const softAvoid = new Set([
    ...(options.softAvoidWordIds ?? []),
    ...(options.recentlyUsedIds ?? []),
  ]);
  // Incorrect words from the last section stay preferred even if also "used".
  for (const wordId of options.softPreferWordIds ?? []) {
    softAvoid.delete(wordId);
  }

  const picked = sampleItemsWithPreferences(words, count, {
    getWordId: (word) => word.id,
    getCreatedAt: (word) => word.createdAt,
    softAvoidWordIds: softAvoid,
    softPreferWordIds: options.softPreferWordIds,
  });

  if (picked.length >= count || words.length === 0) return picked;

  // Very small banks: cycle until we fill the requested AI batch size.
  const ordered = [...picked];
  const remainder = sampleItemsWithPreferences(words, words.length, {
    getWordId: (word) => word.id,
    getCreatedAt: (word) => word.createdAt,
  });
  for (let index = 0; ordered.length < count; index += 1) {
    ordered.push(remainder[index % remainder.length]!);
  }
  return ordered;
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
