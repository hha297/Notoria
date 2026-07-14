import type { FlashcardWord } from "@/types/flashcards";
import { primaryMeaning } from "@/lib/exercises/utils";

export type MatchPairItem = {
  wordId: string;
  word: string;
  meaning: string;
};

export function buildMatchPairItems(words: FlashcardWord[]): MatchPairItem[] {
  return words
    .filter((word) => word.meanings.length > 0)
    .map((word) => ({
      wordId: word.id,
      word: word.word,
      meaning: primaryMeaning(word.meanings),
    }));
}
