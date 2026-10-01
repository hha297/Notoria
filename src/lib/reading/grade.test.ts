import { describe, expect, it } from "vitest";
import { gradeObjectiveAnswer } from "@/lib/reading/grade";
import { countWords, validatePassageBody } from "@/lib/reading/utils";

describe("reading utils", () => {
  it("counts words", () => {
    expect(countWords("one two  three")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("rejects short passages", () => {
    const result = validatePassageBody("too short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("EMPTY_CONTENT");
  });
});

describe("reading objective grading", () => {
  it("grades multiple choice case-insensitively", () => {
    expect(
      gradeObjectiveAnswer({
        type: "multiple_choice",
        correctAnswer: "Helsinki",
        response: "helsinki",
      }),
    ).toBe(true);
  });

  it("grades true/false/not stated", () => {
    expect(
      gradeObjectiveAnswer({
        type: "true_false_not_stated",
        correctAnswer: "not_stated",
        response: "not stated",
      }),
    ).toBe(true);
  });

  it("skips written answers", () => {
    expect(
      gradeObjectiveAnswer({
        type: "written",
        correctAnswer: "anything",
        response: "response",
      }),
    ).toBeNull();
  });
});
