import type { FlashcardWord } from "@/types/flashcards";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type FillBlankItem = {
  id: string;
  wordId: string;
  word: string;
  meanings: string[];
  sentenceBefore: string;
  sentenceAfter: string;
  acceptableAnswers: string[];
};

function buildAcceptableAnswers(word: string, matchedWord: string) {
  const answers = new Set<string>();
  for (const candidate of [matchedWord, word]) {
    const trimmed = candidate.trim();
    if (trimmed) {
      answers.add(trimmed);
      answers.add(trimmed.toLowerCase());
    }
  }
  return [...answers];
}

function splitSentenceAtWord(sentence: string, word: string) {
  const regex = new RegExp(`(${escapeRegExp(word)})`, "iu");
  const match = regex.exec(sentence);
  if (!match || match.index === undefined) return null;
  return {
    before: sentence.slice(0, match.index),
    matched: match[0],
    after: sentence.slice(match.index + match[0].length),
  };
}

export function buildFillBlankItems(words: FlashcardWord[]): FillBlankItem[] {
  const items: FillBlankItem[] = [];

  for (const word of words) {
    for (const [index, example] of word.examples.entries()) {
      const split = splitSentenceAtWord(example, word.word);
      if (!split) continue;

      items.push({
        id: `${word.id}-${index}`,
        wordId: word.id,
        word: word.word,
        meanings: word.meanings,
        sentenceBefore: split.before,
        sentenceAfter: split.after,
        acceptableAnswers: buildAcceptableAnswers(word.word, split.matched),
      });
    }
  }

  return items;
}
