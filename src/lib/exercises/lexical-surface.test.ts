import { describe, expect, it } from "vitest";
import {
  CONTEXTUAL_MC_GENERATOR_PROMPT,
  CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT,
} from "@/lib/exercises/contextual-ai-prompt";
import { FILL_BLANK_GENERATOR_PROMPT } from "@/lib/exercises/ai-prompt";
import { FORM_SENTENCE_EVALUATOR_PROMPT } from "@/lib/exercises/form-sentence-ai-prompt";
import {
  LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE,
  LEXICAL_SURFACE_EVALUATOR_GUIDANCE,
  LEXICAL_SURFACE_GUIDANCE,
  LEXICAL_SURFACE_MC_GUIDANCE,
  acceptResolvedSurfaceForm,
  blankExactUsedForm,
  filledSentenceUsesForm,
  isRelatedWordForm,
  resolveContextualFromCompleteSentence,
  surfaceAnswersForBlank,
} from "@/lib/exercises/lexical-surface";
import { answersMatchAny } from "@/lib/exercises/utils";

describe("lexical surface invariants", () => {
  it("treats a differing surface form as the only typed answer", () => {
    const answers = surfaceAnswersForBlank("alpha", "alphas");
    expect(answers).toContain("alphas");
    expect(answersMatchAny("alphas", answers)).toBe(true);
    expect(answersMatchAny("Alphas", answers)).toBe(true);
    expect(answersMatchAny("alpha", answers)).toBe(false);
  });

  it("still accepts the lemma when it is the required surface form", () => {
    const answers = surfaceAnswersForBlank("alpha", "alpha");
    expect(answersMatchAny("alpha", answers)).toBe(true);
    expect(answersMatchAny("Alpha", answers)).toBe(true);
  });

  it("requires the completed sentence to contain the surface form", () => {
    expect(filledSentenceUsesForm("This is a ________ test.", "alphas")).toBe(
      true,
    );
    expect(filledSentenceUsesForm("This is a test.", "alphas")).toBe(false);
  });

  it("accepts a related surface form and rejects an unrelated token", () => {
    expect(
      acceptResolvedSurfaceForm({
        prompt: "This is a ________ test.",
        lemma: "alpha",
        proposed: "alphas",
      }),
    ).toBe("alphas");

    expect(
      acceptResolvedSurfaceForm({
        prompt: "This is a ________ test.",
        lemma: "alpha",
        proposed: "zzzzzz",
      }),
    ).toBeNull();
  });

  it("treats a longer related form as the same lexeme without language-specific rules", () => {
    expect(isRelatedWordForm("alpha", "alphas")).toBe(true);
    expect(isRelatedWordForm("alpha", "omega")).toBe(false);
  });

  it("blanks only the exact used token from a complete sentence", () => {
    expect(blankExactUsedForm("This is a alphas test.", "alphas")).toEqual({
      prompt: "This is a ________ test.",
      usedForm: "alphas",
    });
    expect(blankExactUsedForm("This is a ________ test.", "alphas")).toBeNull();
    expect(blankExactUsedForm("This is a test.", "alphas")).toBeNull();
  });

  it("resolves the exercise from the complete sentence rather than inflecting later", () => {
    expect(
      resolveContextualFromCompleteSentence({
        completeSentence: "This is a alphas test.",
        lemma: "alpha",
        proposed: "alpha",
      }),
    ).toEqual({
      prompt: "This is a ________ test.",
      answerForm: "alphas",
    });

    expect(
      resolveContextualFromCompleteSentence({
        completeSentence: "This is a ________ test.",
        lemma: "alpha",
        proposed: "alphas",
      }),
    ).toBeNull();
  });

  it("is included in generation and evaluation prompts without embedding vocabulary items", () => {
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain(LEXICAL_SURFACE_GUIDANCE);
    expect(CONTEXTUAL_MC_GENERATOR_PROMPT).toContain(LEXICAL_SURFACE_GUIDANCE);
    expect(CONTEXTUAL_MC_GENERATOR_PROMPT).toContain(
      LEXICAL_SURFACE_MC_GUIDANCE,
    );
    expect(CONTEXTUAL_MC_GENERATOR_PROMPT).toContain(
      LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE,
    );
    expect(CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT).toContain(
      LEXICAL_SURFACE_GUIDANCE,
    );
    expect(CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT).toContain(
      LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE,
    );
    expect(FORM_SENTENCE_EVALUATOR_PROMPT).toContain(
      LEXICAL_SURFACE_EVALUATOR_GUIDANCE,
    );
    expect(LEXICAL_SURFACE_GUIDANCE).toMatch(/lemma/i);
    expect(LEXICAL_SURFACE_GUIDANCE).toMatch(/surface form/i);
    expect(CONTEXTUAL_MC_GENERATOR_PROMPT).toMatch(/completeSentence/);
    expect(CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT).toMatch(/completeSentence/);
  });
});
