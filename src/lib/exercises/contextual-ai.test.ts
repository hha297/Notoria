import { describe, expect, it } from "vitest";
import { selectValidContextualExercises } from "@/lib/exercises/contextual-ai";
import type { ContextualAiWordInput } from "@/lib/exercises/contextual-ai-types";

const word: ContextualAiWordInput = {
  id: "w1",
  word: "alpha",
  meaning: "abc",
  partOfSpeech: "noun",
  distractorPool: ["beta", "gamma", "delta", "epsilon"],
};

describe("selectValidContextualExercises", () => {
  it("blanks the exact used form from the complete sentence and keeps that form as the MC answer", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "multiple-choice",
          completeSentence: "This is a alphas test.",
          options: ["alpha", "beta", "gamma", "delta"],
          correctOption: "alphas",
          baseWord: "alpha",
          answerForm: "alphas",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "multiple-choice",
      "medium",
    );

    expect(valid).toHaveLength(1);
    const exercise = valid[0];
    expect(exercise?.type).toBe("multiple-choice");
    if (exercise?.type !== "multiple-choice") return;
    expect(exercise.prompt).toBe("This is a ________ test.");
    expect(exercise.correctOption).toBe("alphas");
    expect(exercise.answerForm).toBe("alphas");
    expect(exercise.baseWord).toBe("alpha");
    expect(exercise.options).toContain("alphas");
    expect(exercise.options).not.toContain("alpha");
    expect(exercise.options).toHaveLength(4);
  });

  it("extracts the in-sentence form even when the draft reports the lemma", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "multiple-choice",
          completeSentence: "This is a alphas test.",
          options: ["alpha", "beta", "gamma", "delta"],
          correctOption: "alpha",
          baseWord: "alpha",
          answerForm: "alpha",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "multiple-choice",
      "medium",
    );

    expect(valid).toHaveLength(1);
    const exercise = valid[0];
    expect(exercise?.type).toBe("multiple-choice");
    if (exercise?.type !== "multiple-choice") return;
    expect(exercise.prompt).toBe("This is a ________ test.");
    expect(exercise.correctOption).toBe("alphas");
    expect(exercise.answerForm).toBe("alphas");
    expect(exercise.options).toContain("alphas");
    expect(exercise.options).not.toContain("alpha");
  });

  it("rejects a blank-first draft", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "multiple-choice",
          prompt: "This is a ________ test.",
          options: ["alphas", "beta", "gamma", "delta"],
          correctOption: "alphas",
          baseWord: "alpha",
          answerForm: "alphas",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "multiple-choice",
      "medium",
    );

    expect(valid).toHaveLength(0);
  });

  it("rejects a complete sentence whose used token is unrelated", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "multiple-choice",
          completeSentence: "This is a zzzzzz test.",
          options: ["zzzzzz", "beta", "gamma", "delta"],
          correctOption: "zzzzzz",
          baseWord: "alpha",
          answerForm: "zzzzzz",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "multiple-choice",
      "medium",
    );

    expect(valid).toHaveLength(0);
  });

  it("blanks the type-answer sentence and keeps the extracted form as the key", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "type-answer",
          completeSentence: "This is a alphas test.",
          answer: "alphas",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "type-answer",
      "medium",
    );

    expect(valid).toHaveLength(1);
    const exercise = valid[0];
    expect(exercise?.type).toBe("type-answer");
    if (exercise?.type !== "type-answer") return;
    expect(exercise.prompt).toBe("This is a ________ test.");
    expect(exercise.answer).toBe("alphas");
  });

  it("rejects a blank-first type-answer draft", () => {
    const valid = selectValidContextualExercises(
      [
        {
          wordId: "w1",
          type: "type-answer",
          prompt: "This is a ________ test.",
          answer: "alphas",
          sentenceMeaning: "Sentence gloss in the UI language.",
        },
      ],
      [word],
      "type-answer",
      "medium",
    );

    expect(valid).toHaveLength(0);
  });
});
