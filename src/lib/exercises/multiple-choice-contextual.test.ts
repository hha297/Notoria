import { describe, expect, it } from "vitest";
import {
  contextualExerciseToQuestion,
  contextualPromptWithMeaningHint,
  fillContextualBlank,
} from "@/lib/exercises/multiple-choice";
import type { FlashcardWord } from "@/types/flashcards";

const sampleWord = (overrides: Partial<FlashcardWord> = {}): FlashcardWord =>
  ({
    id: "w1",
    word: "alpha",
    meanings: ["abc"],
    partOfSpeech: "noun",
    synonyms: null,
    notes: null,
    status: "NEW",
    tags: [],
    examples: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  }) as FlashcardWord;

describe("fillContextualBlank", () => {
  it("inserts the grammatical answer form at the blank", () => {
    expect(fillContextualBlank("This is a ________ test.", "alphas")).toBe(
      "This is a alphas test.",
    );
  });

  it("lowercases mid-sentence fills even if the form arrives capitalized", () => {
    expect(fillContextualBlank("This is a ________ test.", "Alphas")).toBe(
      "This is a alphas test.",
    );
  });

  it("capitalizes when the blank starts the sentence", () => {
    expect(fillContextualBlank("________ is ready.", "alpha")).toBe(
      "Alpha is ready.",
    );
  });
});

describe("contextualExerciseToQuestion", () => {
  it("keeps base option and stores answerForm for reveal", () => {
    const question = contextualExerciseToQuestion(
      {
        wordId: "w1",
        prompt: "This is a ________ test.",
        options: ["alpha", "beta", "gamma", "delta"],
        correctOption: "alpha",
        baseWord: "alpha",
        answerForm: "alphas",
        sentenceMeaning: "Sentence gloss in the UI language.",
      },
      sampleWord(),
      0,
    );

    expect(question).not.toBeNull();
    expect(question!.correctOption).toBe("alpha");
    expect(question!.answerForm).toBe("alphas");
    expect(question!.baseWord).toBe("alpha");
    expect(question!.meaningHint).toBe("abc");
    expect(question!.options).toHaveLength(4);
    expect(fillContextualBlank(question!.prompt, question!.answerForm!)).toBe(
      "This is a alphas test.",
    );
    expect(contextualPromptWithMeaningHint(question!)).toBe(
      "This is a ________ (abc) test.",
    );
  });

  it("rejects questions without a vocabulary meaning hint", () => {
    expect(
      contextualExerciseToQuestion(
        {
          wordId: "w1",
          prompt: "This is a ________ test.",
          options: ["alpha", "beta", "gamma", "delta"],
          correctOption: "alpha",
          answerForm: "alphas",
        },
        sampleWord({ meanings: [] }),
        0,
      ),
    ).toBeNull();

    expect(
      contextualExerciseToQuestion(
        {
          wordId: "w1",
          prompt: "This is a ________ test.",
          options: ["alpha", "beta", "gamma", "delta"],
          correctOption: "alpha",
          answerForm: "alphas",
        },
        undefined,
        0,
      ),
    ).toBeNull();
  });

  it("rejects questions without exactly 4 options", () => {
    expect(
      contextualExerciseToQuestion(
        {
          wordId: "w1",
          prompt: "This is a ________ test.",
          options: ["alpha", "beta", "gamma"],
          correctOption: "alpha",
        },
        sampleWord(),
        0,
      ),
    ).toBeNull();
  });
});
