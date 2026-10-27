import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEORY_QUESTION_TYPE,
  resolveTheoryQuestionType,
} from "@/lib/theory-exercises/question-type";

describe("theory question type", () => {
  it("treats missing and legacy values as fill in the blank", () => {
    expect(resolveTheoryQuestionType(undefined)).toBe(DEFAULT_THEORY_QUESTION_TYPE);
    expect(resolveTheoryQuestionType(null)).toBe("fill_blank");
    expect(resolveTheoryQuestionType("transformation")).toBe("fill_blank");
  });

  it("preserves a saved multiple-choice selection", () => {
    expect(resolveTheoryQuestionType("multiple_choice")).toBe("multiple_choice");
  });
});
