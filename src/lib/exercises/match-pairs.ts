import type { FlashcardWord } from "@/types/flashcards";
import {
  assignWordMeanings,
  filterConflictFreeAssignments,
} from "@/lib/exercises/utils";

export type MatchPairItem = {
  wordId: string;
  word: string;
  meaning: string;
};

export function buildMatchPairItems(words: FlashcardWord[]): MatchPairItem[] {
  const assignments = assignWordMeanings(words);
  const conflictFree = filterConflictFreeAssignments(words, assignments);

  return conflictFree.map((word) => ({
    wordId: word.id,
    word: word.word,
    meaning: assignments.get(word.id)!,
  }));
}
