export type VocabularySynonymRef = {
  id: string;
  word: string;
  meaning: string | null;
};

export function normalizeVocabularyWord(word: string) {
  return word.trim().toLowerCase();
}

export function parseLegacySynonymNames(value: string | null | undefined) {
  if (!value?.trim()) return [];
  return value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatSynonymNames(synonyms: Pick<VocabularySynonymRef, "word">[]) {
  return synonyms
    .map((item) => item.word.trim())
    .filter(Boolean)
    .join(", ");
}

export function orderedSynonymPair(leftId: string, rightId: string) {
  return leftId < rightId
    ? { wordId: leftId, synonymId: rightId }
    : { wordId: rightId, synonymId: leftId };
}

export function primaryMeaningText(
  meanings: Array<{ meaning: string; isPrimary?: boolean; sortOrder?: number }>,
) {
  const primary = meanings
    .filter((item) => item.isPrimary !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return primary[0]?.meaning ?? meanings[0]?.meaning ?? null;
}

export function synonymPeerId(
  wordId: string,
  pair: { wordId: string; synonymId: string },
) {
  return pair.wordId === wordId ? pair.synonymId : pair.wordId;
}

export function uniqueSynonymIds(ids: string[], excludeId?: string | null) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!id || id === excludeId || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function matchLegacySynonyms(
  names: string[],
  options: VocabularySynonymRef[],
  excludeId?: string | null,
) {
  const byName = new Map(
    options.map((option) => [normalizeVocabularyWord(option.word), option]),
  );
  const matched: VocabularySynonymRef[] = [];
  const unmatched: string[] = [];

  for (const name of names) {
    const option = byName.get(normalizeVocabularyWord(name));
    if (option && option.id !== excludeId) {
      if (!matched.some((item) => item.id === option.id)) {
        matched.push(option);
      }
    } else if (normalizeVocabularyWord(name)) {
      unmatched.push(name);
    }
  }

  return { matched, unmatched };
}
