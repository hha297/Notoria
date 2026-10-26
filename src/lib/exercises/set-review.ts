import type { SetQuestionResult } from "@/lib/exercises/set-attempt";

export type ExerciseReviewFilter = "all" | "needs_review" | "correct";

export function needsReviewResult(
  result: SetQuestionResult | undefined,
): boolean {
  if (!result) return true;
  return !result.correct || result.unanswered;
}

export function matchesReviewFilter(
  result: SetQuestionResult | undefined,
  filter: ExerciseReviewFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "correct") return Boolean(result?.correct);
  return needsReviewResult(result);
}

export function filterQuestionIdsForReview(
  questionIds: readonly string[],
  results: Readonly<Record<string, SetQuestionResult>>,
  filter: ExerciseReviewFilter,
): string[] {
  return questionIds.filter((id) => matchesReviewFilter(results[id], filter));
}

export function reviewCounts(
  questionIds: readonly string[],
  results: Readonly<Record<string, SetQuestionResult>>,
): {
  all: number;
  needsReview: number;
  correct: number;
  incorrect: number;
  unanswered: number;
} {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  for (const id of questionIds) {
    const row = results[id];
    if (!row || row.unanswered) {
      unanswered += 1;
      continue;
    }
    if (row.correct) correct += 1;
    else incorrect += 1;
  }
  return {
    all: questionIds.length,
    needsReview: incorrect + unanswered,
    correct,
    incorrect,
    unanswered,
  };
}

/** Original 1-based question numbers keyed by id (stable under filtering). */
export function originalQuestionNumbers(
  questionIds: readonly string[],
): Record<string, number> {
  const map: Record<string, number> = {};
  questionIds.forEach((id, index) => {
    map[id] = index + 1;
  });
  return map;
}
