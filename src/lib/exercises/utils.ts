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

export function primaryMeaning(meanings: string[], fallback = "—") {
  return meanings[0]?.trim() || fallback;
}
