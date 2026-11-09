import {
  pickVocabularyExample,
  reconstructFillBlankSentence,
} from "@/lib/exercises/pick-vocabulary-example";
import type { FillBlankItem } from "@/lib/exercises/fill-blank";
import type { FlashcardExample, FlashcardWord } from "@/types/flashcards";

export type WordUsageExample = {
  example: FlashcardExample;
  lemma: string;
  /** Primary + secondary glosses for highlighting inside the translation. */
  meanings: string[];
};

/** Build a wordId → FlashcardWord lookup from the session word bank. */
export function buildWordsById(words: FlashcardWord[]) {
  return new Map(words.map((word) => [word.id, word] as const));
}

function exampleEntriesFor(word: FlashcardWord): FlashcardExample[] {
  if (word.exampleEntries && word.exampleEntries.length > 0) {
    return word.exampleEntries;
  }
  return word.examples.map((sentence) => ({
    sentence,
    meaning: null,
  }));
}

function meaningsFor(word: FlashcardWord) {
  return [
    ...word.meanings,
    ...(word.secondaryMeanings ?? []),
  ]
    .map((meaning) => meaning.trim())
    .filter(Boolean);
}

export function usageExampleForWord(
  wordsById: Map<string, FlashcardWord>,
  wordId: string,
  options?: { excludeSentence?: string | null; lemma?: string | null },
): WordUsageExample | null {
  const word = wordsById.get(wordId);
  if (!word) return null;

  const example = pickVocabularyExample(exampleEntriesFor(word), {
    excludeSentence: options?.excludeSentence,
    lemma: options?.lemma ?? word.word,
  });
  if (!example) return null;

  return {
    example,
    lemma: word.word,
    meanings: meaningsFor(word),
  };
}

/** Prefer a different saved example than the fill-blank stem when possible. */
export function usageExampleForFillBlank(
  wordsById: Map<string, FlashcardWord>,
  item: FillBlankItem,
) {
  const stem = reconstructFillBlankSentence({
    before: item.sentenceBefore,
    answer: item.acceptableAnswers[0] ?? item.word,
    after: item.sentenceAfter,
  });
  return usageExampleForWord(wordsById, item.wordId, {
    excludeSentence: stem,
    lemma: item.word,
  });
}
