import { describe, expect, it } from "vitest";
import {
  countAiContextualItems,
  difficultyAiPayload,
  parseExerciseDifficulty,
} from "@/lib/exercises/difficulty";

describe("exercise difficulty", () => {
  it("parses known levels and falls back", () => {
    expect(parseExerciseDifficulty("hard")).toBe("hard");
    expect(parseExerciseDifficulty("nope")).toBe("medium");
  });

  it("scales AI contextual share by difficulty without filtering vocabulary", () => {
    expect(countAiContextualItems(10, "easy")).toBe(3);
    expect(countAiContextualItems(10, "medium")).toBe(5);
    expect(countAiContextualItems(10, "hard")).toBe(7);
    expect(countAiContextualItems(10, "intensive")).toBe(9);
  });

  it("exposes structured AI guidance without CEFR vocabulary selection", () => {
    const payload = difficultyAiPayload("hard");
    expect(payload.exerciseDifficulty).toBe("hard");
    expect(payload.guidance).toContain("Target vocabulary MUST come only");
    expect(payload).not.toHaveProperty("preferredCefrTags");
    expect(payload).not.toHaveProperty("sentenceComplexityHint");
    expect(payload).not.toHaveProperty("aiCefr");
  });
});
