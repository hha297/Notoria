import { describe, expect, it } from "vitest";
import { buildFormSentenceItems } from "@/lib/exercises/form-sentence";
import {
  pickSessionSizeInRange,
  sampleSessionItems,
} from "@/lib/exercises/session-size";
import {
  formSentenceAiRequestSchema,
  formSentenceAiResultSchema,
} from "@/lib/exercises/form-sentence-ai-types";
import type { FlashcardWord } from "@/types/flashcards";

function word(
  partial: Partial<FlashcardWord> & Pick<FlashcardWord, "id" | "word">,
): FlashcardWord {
  return {
    partOfSpeech: null,
    synonyms: null,
    notes: null,
    status: "NEW",
    meanings: ["durable"],
    examples: [],
    tags: [],
    ...partial,
  };
}

describe("form-sentence items", () => {
  it("keeps only words with a term and meaning", () => {
    const items = buildFormSentenceItems([
      word({ id: "1", word: "kestävä", meanings: ["durable", "sustainable"] }),
      word({ id: "2", word: "  ", meanings: ["empty word"] }),
      word({ id: "3", word: "talo", meanings: [] }),
      word({ id: "4", word: "kirja", meanings: ["book"] }),
    ]);

    expect(items.map((item) => item.wordId).sort()).toEqual(["1", "4"]);
    expect(items.find((item) => item.wordId === "1")?.meaning).toBe(
      "durable · sustainable",
    );
  });
});

describe("form-sentence session size", () => {
  it("randomizes between min and max when enough items exist", () => {
    for (let i = 0; i < 20; i += 1) {
      const size = pickSessionSizeInRange(12, 5, 10);
      expect(size).toBeGreaterThanOrEqual(5);
      expect(size).toBeLessThanOrEqual(10);
    }
  });

  it("uses all items when fewer than the minimum", () => {
    expect(pickSessionSizeInRange(3, 5, 10)).toBe(3);
    expect(sampleSessionItems([1, 2, 3], "form_sentence")).toHaveLength(3);
  });
});

describe("form-sentence AI schemas", () => {
  it("rejects empty sentences", () => {
    const parsed = formSentenceAiRequestSchema.safeParse({
      wordId: "1",
      word: "kestävä",
      meaning: "durable",
      sentence: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid evaluation request", () => {
    const parsed = formSentenceAiRequestSchema.safeParse({
      wordId: "1",
      word: "kestävä",
      meaning: "durable",
      sentence: "This material is durable enough for everyday use.",
      language: "fi",
      partOfSpeech: "adjective",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses sentenceMeaning in the AI result", () => {
    const parsed = formSentenceAiResultSchema.safeParse({
      isCorrect: true,
      grammarExplanation: null,
      correctedSentence: null,
      betterSuggestion: null,
      sentenceMeaning: "This material is durable enough for everyday use.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sentenceMeaning).toBe(
        "This material is durable enough for everyday use.",
      );
    }
  });
});
