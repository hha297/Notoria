import { describe, expect, it } from "vitest";
import {
  answeredProgress,
  countAnsweredQuestions,
  isNonEmptyAnswer,
  retryQuestionIds,
  scoreSetResults,
  unansweredQuestionIds,
} from "@/lib/exercises/set-attempt";

describe("set-attempt helpers", () => {
  it("treats empty and whitespace-only text as unanswered", () => {
    expect(isNonEmptyAnswer("")).toBe(false);
    expect(isNonEmptyAnswer("   ")).toBe(false);
    expect(isNonEmptyAnswer("ok")).toBe(true);
    expect(isNonEmptyAnswer(["a", ""])).toBe(false);
    expect(isNonEmptyAnswer(["a", "b"])).toBe(true);
  });

  it("counts each answered question once and handles empty sets", () => {
    const ids = ["a", "b", "c"];
    expect(countAnsweredQuestions([], {})).toBe(0);
    expect(answeredProgress(0, 0)).toEqual({
      answeredCount: 0,
      totalQuestionCount: 0,
      ratio: 0,
    });
    expect(
      countAnsweredQuestions(ids, { a: "x", b: "  ", c: "y" }),
    ).toBe(2);
    expect(answeredProgress(2, 3).ratio).toBeCloseTo(2 / 3);
  });

  it("lists unanswered ids for jump / confirm UX", () => {
    expect(
      unansweredQuestionIds(["a", "b", "c"], { a: "1", c: "2" }),
    ).toEqual(["b"]);
  });

  it("scores submitted results without double-counting", () => {
    expect(
      scoreSetResults(
        {
          a: { correct: true, unanswered: false },
          b: { correct: false, unanswered: true },
          c: { correct: false, unanswered: false },
        },
        ["a", "b", "c"],
      ),
    ).toEqual({ correct: 1, total: 3, incorrect: 1, unanswered: 1 });
  });

  it("builds retry subsets against the retry set size", () => {
    const ids = ["a", "b", "c"];
    const results = {
      a: { correct: true, unanswered: false },
      b: { correct: false, unanswered: false },
      c: { correct: false, unanswered: true },
    };
    expect(retryQuestionIds(ids, results, "incorrect")).toEqual(["b"]);
    expect(retryQuestionIds(ids, results, "unanswered")).toEqual(["c"]);
    expect(retryQuestionIds(ids, results, "incorrect_or_unanswered")).toEqual([
      "b",
      "c",
    ]);
  });
});
