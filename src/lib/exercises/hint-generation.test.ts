import { describe, expect, it } from "vitest";
import {
  VOCABULARY_MEANING_HINT_PROMPT,
  progressiveHintPromptFor,
  resolveProgressiveHints,
} from "@/lib/exercises/progressive-hints";
import {
  vocabularyMeaningHintRequestSchema,
  VOCAB_MEANING_HINT_BATCH,
} from "@/lib/exercises/hint-generation";

describe("vocabulary meaning hint generation", () => {
  it("accepts a representative word-to-meaning batch and caps size", () => {
    const parsed = vocabularyMeaningHintRequestSchema.safeParse({
      explanationLanguage: "English",
      difficulty: "medium",
      questions: [
        {
          id: "päinvastoin-word",
          direction: "WORD_TO_MEANING",
          prompt: "Päinvastoin",
          options: ["Consistent", "Flood", "How", "On the contrary"],
          correctOption: "On the contrary",
          partOfSpeech: "adverb",
          targetWord: "Päinvastoin",
        },
        {
          id: "hukata-word",
          direction: "WORD_TO_MEANING",
          prompt: "hukata",
          options: [
            "To become anxious",
            "To waste or lose something",
            "To hesitate",
            "To avoid someone",
          ],
          correctOption: "To waste or lose something",
          partOfSpeech: "verb",
          targetWord: "hukata",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    expect(VOCAB_MEANING_HINT_BATCH).toBe(20);
  });

  it("rejects oversized batches and missing correct options", () => {
    const oversized = vocabularyMeaningHintRequestSchema.safeParse({
      explanationLanguage: "English",
      questions: Array.from({ length: VOCAB_MEANING_HINT_BATCH + 1 }, (_, i) => ({
        id: `q-${i}`,
        direction: "WORD_TO_MEANING",
        prompt: "x",
        options: ["a", "b", "c", "d"],
        correctOption: "a",
      })),
    });
    expect(oversized.success).toBe(false);

    const missingAnswer = vocabularyMeaningHintRequestSchema.safeParse({
      explanationLanguage: "English",
      questions: [
        {
          id: "q1",
          direction: "WORD_TO_MEANING",
          prompt: "talo",
          options: ["house", "car"],
        },
      ],
    });
    expect(missingAnswer.success).toBe(false);
  });

  it("documents association prompt requirements for vocabulary MC", () => {
    const prompt = progressiveHintPromptFor("vocabulary-meaning");
    expect(prompt).toBe(VOCABULARY_MEANING_HINT_PROMPT);
    expect(prompt).toMatch(/distractor/i);
    expect(prompt).toMatch(/dictionary gloss|near-paraphrase/i);
    expect(prompt).toMatch(/what this word is for in real life/i);
    expect(prompt).not.toMatch(/Cite the affix pattern/i);
  });

  it("sanitizes AI drafts that leak answers or slip into grammar coaching", () => {
    const päinvastoin = resolveProgressiveHints({
      raw: [
        "Focus on the form the sentence structure requires (ending, stem, or polarity).",
        "Used when pushing back against what was just claimed.",
        "On the contrary",
      ],
      answers: ["On the contrary", "Consistent", "Flood", "How"],
      strategy: "vocabulary-meaning",
      partOfSpeech: "adverb",
      direction: "WORD_TO_MEANING",
    });
    expect(päinvastoin).toEqual([
      "Used when pushing back against what was just claimed.",
    ]);

    const hukata = resolveProgressiveHints({
      raw: [
        "Imagine having something valuable but failing to keep it, or letting an opportunity slip away.",
        "To waste or lose something",
      ],
      answers: [
        "To waste or lose something",
        "To become anxious",
        "To hesitate",
        "To avoid someone",
      ],
      strategy: "vocabulary-meaning",
      partOfSpeech: "verb",
      direction: "WORD_TO_MEANING",
    });
    expect(hukata[0]).toMatch(/valuable|opportunity|slip away/i);
    expect(hukata.join(" ").toLowerCase()).not.toContain("waste or lose");
  });

  it("covers adjective, noun, conjunction, and polysemy-safe fallbacks", () => {
    expect(
      resolveProgressiveHints({
        raw: [],
        answers: ["happy", "blue", "tall", "new"],
        strategy: "vocabulary-meaning",
        partOfSpeech: "adjective",
        direction: "WORD_TO_MEANING",
      })[0],
    ).toMatch(/used to describe|quality|condition/i);

    expect(
      resolveProgressiveHints({
        raw: [],
        answers: ["house", "road", "clock", "meal"],
        strategy: "vocabulary-meaning",
        partOfSpeech: "noun",
        direction: "WORD_TO_MEANING",
      })[0],
    ).toMatch(/used to name|thing|place|role|everyday/i);

    expect(
      resolveProgressiveHints({
        raw: [],
        answers: ["but", "and", "or", "because"],
        strategy: "vocabulary-meaning",
        partOfSpeech: "conjunction",
        direction: "WORD_TO_MEANING",
      })[0],
    ).toMatch(/used for|relating|clauses/i);

    // Ambiguous overlapping options: keep a non-revealing fallback, never invent a fake distinction.
    const overlapping = resolveProgressiveHints({
      raw: [],
      answers: ["start", "begin", "commence", "initiate"],
      strategy: "vocabulary-meaning",
      partOfSpeech: "verb",
      direction: "WORD_TO_MEANING",
    });
    expect(overlapping.length).toBeGreaterThan(0);
    expect(overlapping.join(" ").toLowerCase()).not.toMatch(
      /\b(start|begin|commence|initiate)\b/,
    );
  });
});
