import type { FlashcardWord } from "@/types/flashcards";
import type { FlashcardStudyMode } from "@/types/flashcards";

export type StudyDirection = "WORD_TO_MEANING" | "MEANING_TO_WORD";

export function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMeaningKey(value: string) {
  return normalizeAnswer(value);
}

export function answersMatch(input: string, expected: string) {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

export function answersMatchAny(input: string, expected: string[]) {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return expected.some((item) => normalizeAnswer(item) === normalized);
}

export function studyModeToDirection(
  mode: FlashcardStudyMode,
  wordId: string,
  directions: Record<string, StudyDirection>,
): StudyDirection {
  if (mode === "word-to-meaning") return "WORD_TO_MEANING";
  if (mode === "meaning-to-word") return "MEANING_TO_WORD";
  return directions[wordId] ?? "WORD_TO_MEANING";
}

export function buildMixedDirections(
  wordIds: string[],
): Record<string, StudyDirection> {
  return Object.fromEntries(
    wordIds.map((id) => [
      id,
      Math.random() > 0.5 ? "WORD_TO_MEANING" : "MEANING_TO_WORD",
    ]),
  ) as Record<string, StudyDirection>;
}

export function pickDistractors<T>(
  pool: T[],
  correct: T,
  count: number,
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] {
  const unique = [...new Set(pool.filter((item) => !equals(item, correct)))];
  return shuffleArray(unique).slice(0, count);
}

/** @deprecated Use assignWordMeanings for exercises. */
export function primaryMeaning(meanings: string[], fallback = "—") {
  return meanings[0]?.trim() || fallback;
}

function trimmedMeanings(meanings: string[]) {
  return meanings.map((meaning) => meaning.trim()).filter(Boolean);
}

/**
 * Pick one meaning per word for a session.
 * Prefers a random meaning not already assigned to another word.
 */
export function assignWordMeanings(
  words: FlashcardWord[],
): Map<string, string> {
  const assignments = new Map<string, string>();
  const takenKeys = new Set<string>();

  for (const word of shuffleArray(words.filter((item) => item.meanings.length > 0))) {
    const candidates = shuffleArray(trimmedMeanings(word.meanings));
    const conflictFree = candidates.find(
      (meaning) => !takenKeys.has(normalizeMeaningKey(meaning)),
    );
    const chosen = conflictFree ?? candidates[0];

    if (!chosen) continue;

    assignments.set(word.id, chosen);
    takenKeys.add(normalizeMeaningKey(chosen));
  }

  return assignments;
}

/** True when no other word lists the same meaning (case-insensitive). */
export function isMeaningOwnedByWord(
  meaning: string,
  wordId: string,
  words: FlashcardWord[],
): boolean {
  const key = normalizeMeaningKey(meaning);
  if (!key) return false;

  return !words.some(
    (word) =>
      word.id !== wordId &&
      word.meanings.some((item) => normalizeMeaningKey(item) === key),
  );
}

/** Drop words whose assigned meaning collides with an earlier word in the set. */
export function filterConflictFreeAssignments(
  words: FlashcardWord[],
  assignments: Map<string, string>,
): FlashcardWord[] {
  const seen = new Set<string>();
  const result: FlashcardWord[] = [];

  for (const word of words) {
    const meaning = assignments.get(word.id);
    if (!meaning) continue;

    const key = normalizeMeaningKey(meaning);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(word);
  }

  return result;
}
