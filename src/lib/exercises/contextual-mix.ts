import { countAiContextualItems } from "@/lib/exercises/difficulty";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";
import { shuffleArray } from "@/lib/exercises/utils";

/**
 * Pick which already-selected session items should receive AI contextual variants.
 * Does not change which vocabulary was selected — only which slots get AI formats.
 */
export function pickAiContextualTargets<T>(
  items: T[],
  difficulty: ExerciseDifficulty,
  getWordId: (item: T) => string,
): T[] {
  const count = countAiContextualItems(items.length, difficulty);
  if (count <= 0 || items.length === 0) return [];

  const uniqueByWord = new Map<string, T>();
  for (const item of shuffleArray(items)) {
    const wordId = getWordId(item);
    if (!uniqueByWord.has(wordId)) {
      uniqueByWord.set(wordId, item);
    }
  }

  return [...uniqueByWord.values()].slice(0, count);
}
