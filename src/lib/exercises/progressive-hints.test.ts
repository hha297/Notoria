import { describe, expect, it } from "vitest";
import {
  fallbackProgressiveHints,
  hintRevealsAnswer,
  isLetterClue,
  PROGRESSIVE_HINT_PROMPT,
  resolveProgressiveHints,
  sanitizeProgressiveHints,
} from "@/lib/exercises/progressive-hints";

describe("progressive hints", () => {
  it("keeps at most three grounded hints and drops leaks and letter clues", () => {
    const hints = sanitizeProgressiveHints(
      [
        "Starts with V",
        "The sentence is about a family relationship.",
        "talo",
        "Look at who the sentence is talking about.",
        "Look at who the sentence is talking about.",
        "A fourth extra hint that should be cut.",
        "One more that will not fit.",
      ],
      ["talo"],
    );
    expect(hints).toEqual([
      "The sentence is about a family relationship.",
      "Look at who the sentence is talking about.",
      "A fourth extra hint that should be cut.",
    ]);
    expect(isLetterClue("V", ["veli"])).toBe(true);
    expect(hintRevealsAnswer("the answer is talo", "talo")).toBe(true);
  });

  it("builds a difficulty-sensitive fallback without a letter clue", () => {
    const easy = fallbackProgressiveHints({
      grounding: "a sibling",
      difficulty: "easy",
      answers: ["veli"],
    });
    const hard = fallbackProgressiveHints({
      grounding: "a sibling",
      difficulty: "hard",
      answers: ["veli"],
    });
    expect(easy[0]).toContain("a sibling");
    expect(easy[0]).not.toBe(hard[0]);
    expect(easy.join(" ")).not.toMatch(/starts with/i);
    expect(hard.join(" ")).not.toContain("veli");
  });

  it("addresses a submitted mistake when hints are generated with one", () => {
    const hints = resolveProgressiveHints({
      raw: [],
      answers: ["correct"],
      grounding: "the past tense of the verb in this sentence",
      submittedMistake: "walk",
    });
    expect(hints.some((hint) => hint.includes("walk"))).toBe(true);
    expect(hints.join(" ")).not.toContain("correct");
  });

  it("reuses stored hints instead of inventing a letter clue", () => {
    const hints = resolveProgressiveHints({
      raw: ["Notice the time expression in the sentence."],
      legacyHint: "V",
      answers: ["veli"],
      grounding: "a sibling",
    });
    expect(hints).toEqual(["Notice the time expression in the sentence."]);
  });

  it("does not bake sample sentences into the prompt", () => {
    expect(PROGRESSIVE_HINT_PROMPT).not.toMatch(/Minulla on|suomalainen|talo/);
    expect(PROGRESSIVE_HINT_PROMPT).toContain("explanationLanguage");
    expect(PROGRESSIVE_HINT_PROMPT).toContain("submittedMistake");
  });
});
