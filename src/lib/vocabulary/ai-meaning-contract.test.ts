import { describe, expect, it } from "vitest";
import {
  MEANING_VALIDATOR_PROMPT,
  buildMeaningValidationPayload,
} from "@/lib/vocabulary/ai-meaning-contract";
import { sanitizeMeaningSuggestions } from "@/lib/vocabulary/ai-sanitize";
import { vocabularyMeaningInputSchema, vocabularyMeaningResultSchema } from "@/lib/vocabulary/ai-types";

function suggestion(meaning: string, language = "") {
  return { meaning, language, explanation: "" };
}

describe("meaning validation contract", () => {
  it("sends only word → current meaning, never other meanings", () => {
    const payload = buildMeaningValidationPayload({
      word: "kaveri",
      meaning: "Teest",
      language: "fi",
      partOfSpeech: "noun",
      examples: ["Hän on hyvä kaveri."],
    });

    expect(payload).toEqual({
      word: "kaveri",
      currentMeaning: "Teest",
      learningLanguageCode: "fi",
      learningLanguageHint: "Suomi",
      partOfSpeech: "noun",
      wordUsageExamples: ["Hän on hyvä kaveri."],
    });
    expect(payload).not.toHaveProperty("otherMeanings");
    expect(payload).not.toHaveProperty("otherProposedMeanings");
    expect(payload).not.toHaveProperty("existingMeanings");
  });

  it("does not include another meaning as a translation bridge in the request schema", () => {
    const parsed = vocabularyMeaningInputSchema.safeParse({
      word: "kaveri",
      meaning: "Teest",
      language: "fi",
      otherMeanings: ["friend"],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("otherMeanings");
  });

  it("enforces one-way WORD → MEANING instructions", () => {
    expect(MEANING_VALIDATOR_PROMPT).toContain("WORD → MEANING");
    expect(MEANING_VALIDATOR_PROMPT).toContain(
      "Do NOT translate the meaning back into the word",
    );
    expect(MEANING_VALIDATOR_PROMPT).toContain(
      "current meaning → possible word → compare with word",
    );
    expect(MEANING_VALIDATOR_PROMPT).not.toContain("otherProposedMeanings");
    expect(MEANING_VALIDATOR_PROMPT).not.toContain("existing meaning → current meaning");
  });
});

describe("meaning result schema", () => {
  it.each([
    ["kala", "fish", true],
    ["kala", "cá", true],
    ["kala", "poisson", true],
    ["kala", "Fisch", true],
    ["kala", "鱼", true],
    ["kaveri", "friend", true],
    ["kala", "Test", false],
    ["kala", "kalastus", false],
    ["dog", "leash", false],
    ["happy", "sad", false],
    ["kaveri", "Teest", false],
    ["kaveri", "Siuuu", false],
  ] as const)("%s → %s is represented as %s", (word, meaning, isLikelyCorrect) => {
    const parsed = vocabularyMeaningResultSchema.safeParse({
      type: "meaning",
      word,
      wordLanguage: null,
      meaning,
      meaningLanguage: null,
      isLikelyCorrect,
      confidence: 0.99,
      suggestions: isLikelyCorrect
        ? []
        : [{ meaning: "fish", language: "English", explanation: "" }],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.isLikelyCorrect).toBe(isLikelyCorrect);
    expect(parsed.data.word).toBe(word);
    expect(parsed.data.meaning).toBe(meaning);
  });

  it("accepts kala → Test as invalid with a word→meaning suggestion of fish", () => {
    const parsed = vocabularyMeaningResultSchema.safeParse({
      word: "kala",
      wordLanguage: "Finnish",
      meaning: "Test",
      meaningLanguage: "English",
      isLikelyCorrect: false,
      confidence: 0.99,
      suggestions: [{ meaning: "fish", language: "English" }],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.suggestions[0]?.meaning).toBe("fish");
  });
});

describe("sanitizeMeaningSuggestions", () => {
  it("keeps a translation of the word, such as kala → fish", () => {
    const kept = sanitizeMeaningSuggestions("kala", "Test", [
      suggestion("fish", "English"),
    ], {
      wordLanguage: "Finnish",
      meaningLanguage: "English",
    });

    expect(kept.map((item) => item.meaning)).toEqual(["fish"]);
  });

  it("drops related derivations such as kala → kalastus", () => {
    const kept = sanitizeMeaningSuggestions("kala", "Test", [
      suggestion("kalastus", "Finnish"),
    ], {
      wordLanguage: "Finnish",
      meaningLanguage: "English",
    });

    expect(kept).toEqual([]);
  });

  it("does not keep a reverse translation such as ystävä when the current meaning is English", () => {
    const kept = sanitizeMeaningSuggestions("kaveri", "Teest", [
      suggestion("ystävä", "Finnish"),
      suggestion("friend", "English"),
    ], {
      wordLanguage: "Finnish",
      meaningLanguage: "English",
    });

    expect(kept.map((item) => item.meaning)).toEqual(["friend"]);
  });

  it("does not use another meaning as evidence when sanitizing Teest", () => {
    const kept = sanitizeMeaningSuggestions("kaveri", "Teest", [
      suggestion("friend", "English"),
    ], {
      wordLanguage: "Finnish",
      meaningLanguage: "English",
    });

    expect(kept.map((item) => item.meaning)).toEqual(["friend"]);
  });
});
