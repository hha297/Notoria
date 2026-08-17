import type { VocabularyMeaningResult } from "@/lib/vocabulary/ai-types";

function normalizeComparable(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeLanguage(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

export function isHeadwordVariant(suggestion: string, word: string) {
  const left = normalizeComparable(suggestion);
  const right = normalizeComparable(word);
  if (!left || !right) return false;
  if (left === right) return true;

  const distance = levenshtein(left, right);
  const maxLen = Math.max(left.length, right.length);
  if (maxLen <= 2) return false;

  return distance <= 2 && distance / maxLen <= 0.4;
}

function isLikelyRelatedDerivation(suggestion: string, word: string) {
  const left = normalizeComparable(suggestion);
  const right = normalizeComparable(word);
  if (!left || !right || left === right) return false;
  if (right.length < 3) return false;

  return left.startsWith(right) && left.length - right.length >= 2;
}

function isSameLanguageWordInsteadOfGloss(
  suggestionLanguage: string | undefined,
  wordLanguage?: string | null,
  meaningLanguage?: string | null,
) {
  const suggestionLang = normalizeLanguage(suggestionLanguage);
  const wordLang = normalizeLanguage(wordLanguage);
  const meaningLang = normalizeLanguage(meaningLanguage);
  if (!suggestionLang || !wordLang || !meaningLang) return false;
  return suggestionLang === wordLang && meaningLang !== wordLang;
}

export function sanitizeMeaningSuggestions(
  word: string,
  originalMeaning: string,
  suggestions: VocabularyMeaningResult["suggestions"],
  languages?: {
    wordLanguage?: string | null;
    meaningLanguage?: string | null;
  },
) {
  const original = normalizeComparable(originalMeaning);

  return suggestions.filter((item) => {
    const meaning = item.meaning.trim();
    if (!meaning) return false;
    if (original && normalizeComparable(meaning) === original) return false;
    if (isHeadwordVariant(meaning, word)) return false;
    if (isLikelyRelatedDerivation(meaning, word)) return false;
    if (
      isSameLanguageWordInsteadOfGloss(
        item.language,
        languages?.wordLanguage,
        languages?.meaningLanguage,
      )
    ) {
      return false;
    }
    return true;
  });
}
