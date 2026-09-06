import type { FlashcardWord } from "@/types/flashcards";
import { shuffleArray } from "@/lib/exercises/utils";

export type FormSentenceItem = {
  id: string;
  wordId: string;
  word: string;
  meaning: string;
  meanings: string[];
  partOfSpeech: string | null;
};

/** Build practice items from vocabulary that has a word and at least one meaning. */
export function buildFormSentenceItems(
  words: FlashcardWord[],
): FormSentenceItem[] {
  const items: FormSentenceItem[] = [];

  for (const word of words) {
    const term = word.word.trim();
    if (!term) continue;

    const meanings = word.meanings
      .map((meaning) => meaning.trim())
      .filter(Boolean);
    if (meanings.length === 0) continue;

    items.push({
      id: word.id,
      wordId: word.id,
      word: term,
      meaning: meanings.join(" · "),
      meanings,
      partOfSpeech: word.partOfSpeech,
    });
  }

  return shuffleArray(items);
}
