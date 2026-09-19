import { describe, expect, it } from "vitest";
import {
  buildTypeAnswerItems,
  contextualExerciseToTypeAnswerItem,
  typeAnswerPromptWithMeaningHint,
  typeAnswerRevealPrompt,
} from "@/lib/exercises/type-answer";
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

describe("type-answer study modes", () => {
  it("builds deterministic word-to-meaning items without mixed directions", () => {
    const items = buildTypeAnswerItems(
      [sampleWord(), sampleWord({ id: "w2", word: "beta", meanings: ["xyz"] })],
      "word-to-meaning",
    );
    expect(items.every((item) => item.direction === "WORD_TO_MEANING")).toBe(
      true,
    );
  });

  it("maps contextual AI exercises to typed blank items", () => {
    const item = contextualExerciseToTypeAnswerItem(
      {
        wordId: "w1",
        prompt: "This is a ________ test.",
        answer: "alphas",
        sentenceMeaning: "Sentence gloss in the UI language.",
      },
      sampleWord(),
      0,
    );
    expect(item).not.toBeNull();
    expect(item!.direction).toBe("CONTEXTUAL");
    expect(item!.answerDisplay).toBe("alphas");
    expect(item!.meaningHint).toBe("abc");
    expect(item!.acceptableAnswers).toContain("alphas");
    expect(item!.acceptableAnswers).not.toContain("alpha");
    expect(typeAnswerPromptWithMeaningHint(item!)).toBe(
      "This is a ________ (abc) test.",
    );
    expect(typeAnswerRevealPrompt(item!)).toBe("This is a alphas (abc) test.");
  });

  it("rejects contextual drafts without a blank", () => {
    expect(
      contextualExerciseToTypeAnswerItem(
        {
          wordId: "w1",
          prompt: "What does alpha mean?",
          answer: "alpha",
        },
        sampleWord(),
        0,
      ),
    ).toBeNull();
  });

  it("rejects contextual drafts without a vocabulary meaning hint", () => {
    expect(
      contextualExerciseToTypeAnswerItem(
        {
          wordId: "w1",
          prompt: "This is a ________ test.",
          answer: "alphas",
        },
        sampleWord({ meanings: [] }),
        0,
      ),
    ).toBeNull();

    expect(
      contextualExerciseToTypeAnswerItem(
        {
          wordId: "w1",
          prompt: "This is a ________ test.",
          answer: "alphas",
        },
        undefined,
        0,
      ),
    ).toBeNull();
  });
});
