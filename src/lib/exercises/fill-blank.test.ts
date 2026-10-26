import { describe, expect, it } from "vitest";
import {
  buildFillBlankItems,
  findBlankInExample,
} from "@/lib/exercises/fill-blank";
import type { FlashcardWord } from "@/types/flashcards";

function word(
  partial: Partial<FlashcardWord> & Pick<FlashcardWord, "id" | "word">,
): FlashcardWord {
  return {
    meanings: ["meaning"],
    examples: [],
    tags: [],
    partOfSpeech: null,
    synonyms: null,
    notes: null,
    status: "NEW",
    createdAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("findBlankInExample", () => {
  it("blanks an exact whole-token lemma and keeps punctuation", () => {
    expect(findBlankInExample("I bought a new talo yesterday.", "talo")).toEqual({
      before: "I bought a new ",
      matched: "talo",
      after: " yesterday.",
    });
  });

  it("does not blank a substring inside another word", () => {
    expect(findBlankInExample("The category is huge.", "cat")).toBeNull();
  });

  it("uses the surface form when the lemma is inflected", () => {
    expect(findBlankInExample("Asun uudessa talossa.", "talo")).toEqual({
      before: "Asun uudessa ",
      matched: "talossa",
      after: ".",
    });
  });

  it("supports multi-word lemmas as a whole phrase", () => {
    expect(findBlankInExample("Please put on your coat.", "put on")).toEqual({
      before: "Please ",
      matched: "put on",
      after: " your coat.",
    });
  });

  it("skips when the target token appears more than once", () => {
    expect(
      findBlankInExample("The cat saw another cat nearby.", "cat"),
    ).toBeNull();
  });

  it("skips empty or whitespace-only examples", () => {
    expect(findBlankInExample("   ", "talo")).toBeNull();
  });

  it("preserves diacritics in the matched answer", () => {
    expect(findBlankInExample("J'ai mangé une café.", "café")).toEqual({
      before: "J'ai mangé une ",
      matched: "café",
      after: ".",
    });
  });

  it("matches case-insensitively but returns the sentence casing", () => {
    expect(findBlankInExample("Helsinki is lovely.", "helsinki")).toEqual({
      before: "",
      matched: "Helsinki",
      after: " is lovely.",
    });
  });
});

describe("buildFillBlankItems", () => {
  it("builds items from valid examples and skips duplicates", () => {
    const items = buildFillBlankItems([
      word({
        id: "w1",
        word: "talo",
        examples: [
          "Asun uudessa talossa.",
          "Asun uudessa talossa.",
          "Talo on suuri.",
          "",
          "Something unrelated without the word.",
        ],
      }),
    ]);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.acceptableAnswers[0])).toEqual([
      "talossa",
      "Talo",
    ]);
    expect(items.every((item) => item.aiGenerated === false)).toBe(true);
  });

  it("does not invent blanks for ambiguous multi-occurrence sentences", () => {
    const items = buildFillBlankItems([
      word({
        id: "w1",
        word: "cat",
        examples: ["The cat saw another cat."],
      }),
    ]);
    expect(items).toHaveLength(0);
  });
});
