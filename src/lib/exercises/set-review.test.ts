import { describe, expect, it } from "vitest";
import {
  filterQuestionIdsForReview,
  needsReviewResult,
  originalQuestionNumbers,
  reviewCounts,
} from "@/lib/exercises/set-review";

describe("set-review helpers", () => {
  const ids = ["a", "b", "c", "d"];
  const results = {
    a: { correct: true, unanswered: false },
    b: { correct: false, unanswered: false },
    c: { correct: false, unanswered: true },
    // d missing → treat as needs review
  };

  it("flags incorrect, unanswered, and missing rows for review", () => {
    expect(needsReviewResult(results.a)).toBe(false);
    expect(needsReviewResult(results.b)).toBe(true);
    expect(needsReviewResult(results.c)).toBe(true);
    expect(needsReviewResult(undefined)).toBe(true);
  });

  it("filters and counts review buckets", () => {
    expect(filterQuestionIdsForReview(ids, results, "correct")).toEqual(["a"]);
    expect(filterQuestionIdsForReview(ids, results, "needs_review")).toEqual([
      "b",
      "c",
      "d",
    ]);
    expect(reviewCounts(ids, results)).toEqual({
      all: 4,
      needsReview: 3,
      correct: 1,
      incorrect: 1,
      unanswered: 2,
    });
  });

  it("keeps original 1-based numbers under filtering", () => {
    expect(originalQuestionNumbers(ids)).toEqual({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    });
  });
});
