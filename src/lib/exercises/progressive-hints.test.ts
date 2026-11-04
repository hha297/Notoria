import { describe, expect, it } from "vitest";
import { partialAnswerHint } from "@/lib/exercises/hint";
import {
  fallbackProgressiveHints,
  GRAMMAR_FORM_HINT_PROMPT,
  hintRestatesVisibleMeaning,
  hintRevealsAnswer,
  isGenericAdviceHint,
  isGrammarFormCoachingHint,
  isLetterClue,
  morphologyHintFromForms,
  progressiveHintPromptFor,
  PROGRESSIVE_HINT_PROMPT,
  resolveProgressiveHints,
  sanitizeProgressiveHints,
  THEORY_RULE_HINT_PROMPT,
  vocabularyMeaningFallbackHint,
  VOCABULARY_MEANING_HINT_PROMPT,
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
      strategy: "grammar-form",
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
      strategy: "grammar-form",
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
      strategy: "grammar-form",
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
      strategy: "grammar-form",
    });
    expect(hints).toEqual(["Notice the time expression in the sentence."]);
  });

  it("documents explanation-language grammar hints without baking sample sentences", () => {
    expect(PROGRESSIVE_HINT_PROMPT).not.toMatch(/Minulla on|suomalainen|talo/);
    expect(PROGRESSIVE_HINT_PROMPT).toContain("explanationLanguage");
    expect(PROGRESSIVE_HINT_PROMPT).toContain("submittedMistake");
    expect(PROGRESSIVE_HINT_PROMPT).toMatch(/grammatical|morpholog|construction/i);
    expect(PROGRESSIVE_HINT_PROMPT).not.toMatch(/masked spelling as the default/i);
    expect(GRAMMAR_FORM_HINT_PROMPT).toBe(PROGRESSIVE_HINT_PROMPT);
  });

  it("uses usage fallbacks for vocabulary-meaning instead of morphology coaching", () => {
    const badMorphology =
      "Focus on the form the sentence structure requires (ending, stem, or polarity).";
    expect(isGrammarFormCoachingHint(badMorphology)).toBe(true);

    const hints = resolveProgressiveHints({
      raw: [badMorphology],
      answers: ["On the contrary", "Consistent", "Flood", "How"],
      strategy: "vocabulary-meaning",
      partOfSpeech: "adverb",
      direction: "WORD_TO_MEANING",
    });

    expect(hints.join(" ")).not.toMatch(/ending|stem|polarity|sentence structure/i);
    expect(hints[0]?.toLowerCase()).toMatch(/used to|framing|everyday|stance/);
    expect(hints.join(" ").toLowerCase()).not.toContain("on the contrary");
    expect(hints.join(" ").toLowerCase()).not.toMatch(/\bhow\b/);
  });

  it("builds usage-oriented vocabulary fallbacks without revealing glosses", () => {
    expect(
      vocabularyMeaningFallbackHint({
        partOfSpeech: "adverb",
        direction: "WORD_TO_MEANING",
        correctOption: "On the contrary",
        options: ["Consistent", "Flood", "How", "On the contrary"],
      }),
    ).toMatch(/used to|framing|everyday|stance/i);

    expect(
      vocabularyMeaningFallbackHint({
        partOfSpeech: "verb",
        direction: "WORD_TO_MEANING",
        correctOption: "Play",
        options: ["Uncle", "Loud", "Look Forward To", "Play"],
      }),
    ).toMatch(/used for|action|activity/i);

    expect(
      vocabularyMeaningFallbackHint({
        partOfSpeech: "verb",
        direction: "WORD_TO_MEANING",
        correctOption: "Play",
        options: ["Uncle", "Loud", "Look Forward To", "Play"],
      }),
    ).not.toMatch(/picture the action/i);

    const resolved = resolveProgressiveHints({
      raw: ["It means on the contrary."],
      answers: ["On the contrary", "Consistent", "Flood", "How"],
      strategy: "vocabulary-meaning",
      partOfSpeech: "adverb",
      direction: "WORD_TO_MEANING",
    });
    expect(resolved.join(" ").toLowerCase()).not.toContain("on the contrary");
  });

  it("keeps theory-rule prompts focused on rules rather than vocabulary definitions", () => {
    expect(progressiveHintPromptFor("theory-rule")).toBe(THEORY_RULE_HINT_PROMPT);
    expect(THEORY_RULE_HINT_PROMPT).toMatch(/grammatical rule|Theory/i);
    expect(THEORY_RULE_HINT_PROMPT).not.toMatch(/dictionary definition/i);

    const hints = resolveProgressiveHints({
      raw: [],
      answers: ["-ssa"],
      grounding: "inessive case for location",
      strategy: "theory-rule",
    });
    expect(hints[0]?.toLowerCase()).toMatch(/rule|objective|inessive|location/);
    expect(hints.join(" ")).not.toContain("-ssa");
  });

  it("selects exercise-specific prompt builders", () => {
    expect(progressiveHintPromptFor("vocabulary-meaning")).toBe(
      VOCABULARY_MEANING_HINT_PROMPT,
    );
    expect(progressiveHintPromptFor("grammar-form")).toBe(GRAMMAR_FORM_HINT_PROMPT);
    expect(VOCABULARY_MEANING_HINT_PROMPT).toMatch(/usage|distractor|partOfSpeech|real life/i);
    expect(VOCABULARY_MEANING_HINT_PROMPT).not.toMatch(
      /ending, particle, or stem change/i,
    );
  });

  it("drops vocabulary hints that paraphrase the correct option", () => {
    const hints = sanitizeProgressiveHints(
      [
        "Imagine opposing what was just claimed.",
        "On the contrary",
        "It means consistent behavior.",
      ],
      ["On the contrary", "Consistent", "Flood", "How"],
      { strategy: "vocabulary-meaning" },
    );
    expect(hints).toEqual(["Imagine opposing what was just claimed."]);
  });
});
