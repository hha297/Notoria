export type VocabularyWordIdentity = {
  word: string;
  partOfSpeech?: string | null;
};

export function normalizeVocabularyWord(word: string) {
  return word.trim().toLowerCase();
}

export function normalizePartOfSpeech(partOfSpeech?: string | null) {
  return partOfSpeech?.trim() || "";
}

export function isSameVocabularyIdentity(
  left: VocabularyWordIdentity,
  right: VocabularyWordIdentity,
) {
  return (
    normalizeVocabularyWord(left.word) === normalizeVocabularyWord(right.word) &&
    normalizePartOfSpeech(left.partOfSpeech) ===
      normalizePartOfSpeech(right.partOfSpeech)
  );
}
