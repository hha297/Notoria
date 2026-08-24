import { describe, expect, it } from "vitest";
import {
  isSameVocabularyIdentity,
  normalizePartOfSpeech,
  normalizeVocabularyWord,
} from "@/lib/vocabulary/word-identity";

describe("vocabulary word identity", () => {
  it("normalizes words with existing trim/lowercase rules", () => {
    expect(normalizeVocabularyWord("  Run ")).toBe("run");
    expect(normalizeVocabularyWord("RUN")).toBe("run");
  });

  it("treats missing part of speech as empty", () => {
    expect(normalizePartOfSpeech(undefined)).toBe("");
    expect(normalizePartOfSpeech(null)).toBe("");
    expect(normalizePartOfSpeech(" verb ")).toBe("verb");
  });

  it("rejects the same normalized word with the same part of speech", () => {
    expect(
      isSameVocabularyIdentity(
        { word: "Run", partOfSpeech: "verb" },
        { word: "run", partOfSpeech: "verb" },
      ),
    ).toBe(true);
  });

  it("allows the same word with a different part of speech", () => {
    expect(
      isSameVocabularyIdentity(
        { word: "run", partOfSpeech: "verb" },
        { word: "run", partOfSpeech: "noun" },
      ),
    ).toBe(false);
  });

  it("allows a different word with the same part of speech", () => {
    expect(
      isSameVocabularyIdentity(
        { word: "run", partOfSpeech: "verb" },
        { word: "walk", partOfSpeech: "verb" },
      ),
    ).toBe(false);
  });
});
