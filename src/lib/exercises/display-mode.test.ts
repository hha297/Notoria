import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXERCISE_DISPLAY_MODE,
  parseExerciseDisplayMode,
} from "@/lib/exercises/display-mode";

describe("display-mode", () => {
  it("defaults to all questions for unknown values", () => {
    expect(DEFAULT_EXERCISE_DISPLAY_MODE).toBe("all_questions");
    expect(parseExerciseDisplayMode(null)).toBe("all_questions");
    expect(parseExerciseDisplayMode("one-try")).toBe("all_questions");
    expect(parseExerciseDisplayMode("one_by_one")).toBe("one_by_one");
  });
});
