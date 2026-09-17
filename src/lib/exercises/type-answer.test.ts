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
    word: "hana",
    meanings: ["tap", "faucet"],
    partOfSpeech: "noun",
    tags: [],
    learningStatus: "NEW",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  }) as FlashcardWord;

describe("type-answer study modes", () => {
  it("builds deterministic word-to-meaning items without mixed directions", () => {
    const items = buildTypeAnswerItems(
      [sampleWord(), sampleWord({ id: "w2", word: "ovi", meanings: ["door"] })],
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
        prompt: "Mistä tulee ________ keittiössä?",
        answer: "hanasta",
        sentenceMeaning: "Where does it come from in the kitchen?",
      },
      sampleWord(),
      0,
    );
    expect(item).not.toBeNull();
    expect(item!.direction).toBe("CONTEXTUAL");
    expect(item!.answerDisplay).toBe("hanasta");
    expect(typeAnswerPromptWithMeaningHint(item!)).toBe(
      "Mistä tulee ________ (tap) keittiössä?",
    );
    expect(typeAnswerRevealPrompt(item!)).toBe(
      "Mistä tulee hanasta (tap) keittiössä?",
    );
  });

  it("rejects contextual drafts without a blank", () => {
    expect(
      contextualExerciseToTypeAnswerItem(
        {
          wordId: "w1",
          prompt: "What does hana mean?",
          answer: "hana",
        },
        sampleWord(),
        0,
      ),
    ).toBeNull();
  });
});
