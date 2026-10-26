import { describe, expect, it } from "vitest";
import { partialAnswerHint } from "@/lib/exercises/hint";
import {
  fallbackProgressiveHints,
  hintRestatesVisibleMeaning,
  hintRevealsAnswer,
  isGenericAdviceHint,
  isLetterClue,
  morphologyHintFromForms,
  PROGRESSIVE_HINT_PROMPT,
  resolveProgressiveHints,
  sanitizeProgressiveHints,
} from "@/lib/exercises/progressive-hints";

describe("progressive hints", () => {
  it("keeps grounded hints and drops leaks, letter clues, and generic advice", () => {
    const hints = sanitizeProgressiveHints(
      [
        "Starts with V",
        "The sentence is about a family relationship.",
        "talo",
        "Look at who the sentence is talking about.",
        "Look at who the sentence is talking about.",
        "Use the words around the blank and keep the same idea.",
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
    expect(isGenericAdviceHint("Use the words around the blank.")).toBe(true);
    expect(hintRevealsAnswer("the answer is talo", "talo")).toBe(true);
  });

  it("drops hints that only restate the visible meaning", () => {
    expect(
      hintRestatesVisibleMeaning(
        "Connect the blank to this idea: From anywhere.",
        "From anywhere",
      ),
    ).toBe(true);
    expect(
      sanitizeProgressiveHints(
        ["Connect the blank to this idea: From anywhere."],
        ["mistään"],
        { visibleMeaning: "From anywhere" },
      ),
    ).toEqual([]);
  });

  it("builds a morphology-focused spelling-progressive fallback without repeating the gloss", () => {
    const hints = fallbackProgressiveHints({
      grounding: "From anywhere",
      difficulty: "medium",
      answers: ["mistään"],
      visibleMeaning: "From anywhere",
      mode: "spelling-progressive",
      lemma: "mikään",
      spellingAnswer: "mistään",
    });
    expect(hints.join(" ").toLowerCase()).not.toContain("from anywhere");
    expect(hints.join(" ")).not.toMatch(/use the words around the blank|connect the blank/i);
    expect(hints[0]?.toLowerCase()).toMatch(/inflect|ending|lemma|morpholog|form|stem/);
  });

  it("cites a short ending pattern from lemma vs answer", () => {
    const hint = morphologyHintFromForms({
      lemma: "talo",
      answer: "talossa",
      difficulty: "easy",
    });
    expect(hint).toContain("ssa");
    expect(hint?.toLowerCase()).not.toContain("talossa");
  });

  it("appends a deterministic spelling mask as the final typed-answer hint", () => {
    const hints = resolveProgressiveHints({
      raw: ["Use the elative case ending here."],
      answers: ["mistään", "mistaan"],
      grounding: "From anywhere",
      visibleMeaning: "From anywhere",
      mode: "spelling-progressive",
      spellingAnswer: "mistään",
    });
    expect(hints[0]).toBe("Use the elative case ending here.");
    expect(hints.at(-1)).toBe(partialAnswerHint("mistään"));
    expect(hints.at(-1)).toBe("mis____");
    expect(hints.join(" ")).not.toContain("mistään");
  });

  it("addresses a submitted mistake when hints are generated with one", () => {
    const hints = resolveProgressiveHints({
      raw: [],
      answers: ["correct"],
      grounding: "the past tense of the verb in this sentence",
      submittedMistake: "walk",
      mode: "standard",
    });
    expect(hints.some((hint) => hint.includes("walk"))).toBe(true);
    expect(hints.join(" ")).not.toContain("correct");
  });

  it("reuses stored grammar hints instead of inventing a letter clue", () => {
    const hints = resolveProgressiveHints({
      raw: ["Notice the time expression in the sentence."],
      legacyHint: "V",
      answers: ["veli"],
      grounding: "a sibling",
      mode: "standard",
    });
    expect(hints).toEqual(["Notice the time expression in the sentence."]);
  });

  it("documents explanation-language grammar hints without baking sample sentences", () => {
    expect(PROGRESSIVE_HINT_PROMPT).not.toMatch(/Minulla on|suomalainen|talo/);
    expect(PROGRESSIVE_HINT_PROMPT).toContain("explanationLanguage");
    expect(PROGRESSIVE_HINT_PROMPT).toContain("submittedMistake");
    expect(PROGRESSIVE_HINT_PROMPT).toMatch(/grammatical|morpholog|construction/i);
    expect(PROGRESSIVE_HINT_PROMPT).not.toMatch(/masked spelling as the default/i);
  });
});
