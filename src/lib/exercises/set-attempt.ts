/**
 * Shared helpers for set-level exercise attempts:
 * answer in any order → one submit → per-question results.
 */

export type SetAttemptPhase = "answering" | "submitted";

export type SetQuestionResult = {
  correct: boolean;
  /** True when the learner left the question blank at submit time. */
  unanswered: boolean;
};

export function isNonEmptyAnswer(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every((part) => typeof part === "string" && part.trim().length > 0)
    );
  }
  if (value == null) return false;
  return String(value).trim().length > 0;
}

export function answeredProgress(
  answeredCount: number,
  totalQuestionCount: number,
): {
  answeredCount: number;
  totalQuestionCount: number;
  ratio: number;
} {
  const total = Math.max(0, totalQuestionCount);
  const answered = Math.min(Math.max(0, answeredCount), total);
  return {
    answeredCount: answered,
    totalQuestionCount: total,
    ratio: total === 0 ? 0 : answered / total,
  };
}

export function countAnsweredQuestions(
  questionIds: readonly string[],
  answers: Readonly<Record<string, unknown>>,
  isAnswered: (questionId: string, value: unknown) => boolean = (_id, value) =>
    isNonEmptyAnswer(value),
): number {
  let count = 0;
  for (const id of questionIds) {
    if (isAnswered(id, answers[id])) count += 1;
  }
  return count;
}

export function unansweredQuestionIds(
  questionIds: readonly string[],
  answers: Readonly<Record<string, unknown>>,
  isAnswered: (questionId: string, value: unknown) => boolean = (_id, value) =>
    isNonEmptyAnswer(value),
): string[] {
  return questionIds.filter((id) => !isAnswered(id, answers[id]));
}

export function scoreSetResults(
  results: Readonly<Record<string, SetQuestionResult>>,
  questionIds: readonly string[],
): { correct: number; total: number } {
  let correct = 0;
  for (const id of questionIds) {
    if (results[id]?.correct) correct += 1;
  }
  return { correct, total: questionIds.length };
}

/**
 * Build a retry question id list: incorrect and/or unanswered from the last submit.
 * Falls back to the full set when the filter would be empty.
 */
export function retryQuestionIds(
  questionIds: readonly string[],
  results: Readonly<Record<string, SetQuestionResult>>,
  mode: "incorrect" | "unanswered" | "incorrect_or_unanswered" | "all",
): string[] {
  if (mode === "all") return [...questionIds];
  const filtered = questionIds.filter((id) => {
    const row = results[id];
    if (!row) return mode !== "incorrect";
    if (mode === "incorrect") return !row.correct && !row.unanswered;
    if (mode === "unanswered") return row.unanswered;
    return !row.correct || row.unanswered;
  });
  return filtered.length > 0 ? filtered : [...questionIds];
}
