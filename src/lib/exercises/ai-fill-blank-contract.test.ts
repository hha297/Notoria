import { describe, expect, it } from "vitest";
import { FILL_BLANK_GENERATOR_PROMPT, fillBlankUserPayload } from "@/lib/exercises/ai-prompt";
import {
  FILL_BLANK_AI_BATCH,
  FILL_BLANK_PLACEHOLDER,
  exerciseAiRequestSchema,
  exerciseAiResultSchema,
  type ExerciseAiWordInput,
} from "@/lib/exercises/ai-types";
import {
  countFillBlanks,
  fillBlankExerciseToItem,
  isRelatedWordForm,
  selectValidFillBlankExercises,
  sentenceLeaksAnswer,
  splitSentenceAtBlank,
  validateFillBlankExercise,
} from "@/lib/exercises/ai-validate";
import { pickFillBlankAiWords, toExerciseAiWord } from "@/lib/exercises/ai-words";
import { answersMatchAny } from "@/lib/exercises/utils";
import type { FlashcardWord } from "@/types/flashcards";

const kaveri: ExerciseAiWordInput = {
  id: "word-kaveri",
  word: "kaveri",
  meaning: "friend",
  partOfSpeech: "noun",
  topic: null,
  avoidSentences: ["Minun kaverini asuu Helsingissä."],
};

function flashcard(overrides: Partial<FlashcardWord> & Pick<FlashcardWord, "id" | "word">): FlashcardWord {
  return {
    partOfSpeech: "noun",
    synonyms: null,
    notes: null,
    status: "NEW",
    meanings: ["friend"],
    examples: ["Minun kaverini asuu Helsingissä."],
    tags: [],
    ...overrides,
  };
}

describe("fill-in-blank AI request schema", () => {
  it("accepts a 10-word fill-in-blank request with CEFR and avoid sentences", () => {
    const parsed = exerciseAiRequestSchema.parse({
      exerciseType: "fill-in-blank",
      language: "fi",
      level: "A2",
      words: Array.from({ length: 10 }, (_, index) => ({
        id: `word-${index}`,
        word: "kaveri",
        meaning: "friend",
        avoidSentences: ["Minun kaverini asuu Helsingissä."],
      })),
    });

    expect(parsed.exerciseType).toBe("fill-in-blank");
    expect(parsed.level).toBe("a2");
    expect(parsed.words).toHaveLength(FILL_BLANK_AI_BATCH);
    expect(parsed.words[0]?.avoidSentences).toEqual([
      "Minun kaverini asuu Helsingissä.",
    ]);
  });

  it("rejects other exercise types", () => {
    const parsed = exerciseAiRequestSchema.safeParse({
      exerciseType: "translation",
      words: [{ id: "1", word: "kaveri" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than 10 words", () => {
    const parsed = exerciseAiRequestSchema.safeParse({
      exerciseType: "fill-in-blank",
      words: Array.from({ length: 11 }, (_, index) => ({
        id: `word-${index}`,
        word: "kaveri",
      })),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("fill-in-blank AI prompt contract", () => {
  it("requires brand-new sentences and forbids copying examples", () => {
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("from scratch");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("avoidSentences");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain(FILL_BLANK_PLACEHOLDER);
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain(
      "Do NOT reuse existing example sentences or previous exercise questions",
    );
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("CEFR");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("instruction");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain(
      "Do NOT invent a specific grammar topic",
    );
  });

  it("sends examples only as sentences to avoid, never as a source list", () => {
    const payload = fillBlankUserPayload({
      languageHint: "Suomi",
      languageCode: "fi",
      level: "a2",
      words: [kaveri],
    });

    expect(payload.words[0]).toEqual({
      wordId: "word-kaveri",
      word: "kaveri",
      meaning: "friend",
      partOfSpeech: "noun",
      topic: null,
      avoidSentences: ["Minun kaverini asuu Helsingissä."],
    });
    expect(payload.words[0]).not.toHaveProperty("examples");
    expect(payload.words[0]).not.toHaveProperty("existingQuestions");
  });
});

describe("fill-in-blank AI validation", () => {
  it("accepts one blank and an inflected answer", () => {
    const validated = validateFillBlankExercise(
      {
        wordId: kaveri.id,
        sentence: `Tapasin vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa eilen.`,
        answer: "kaverini",
        baseWord: "kaveri",
      },
      kaveri,
    );

    expect(validated).not.toBeNull();
    expect(countFillBlanks(validated!.sentence)).toBe(1);
    expect(isRelatedWordForm("kaveri", "kaverini")).toBe(true);
    expect(answersMatchAny("Kaverini", validated!.answer ? [validated!.answer, "kaveri"] : [])).toBe(
      true,
    );
  });

  it("maps a blanked sentence onto the existing fill-in-blank item shape", () => {
    const item = fillBlankExerciseToItem(
      {
        wordId: kaveri.id,
        sentence: `Tapasin vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa eilen.`,
        answer: "kaverini",
        baseWord: "kaveri",
      },
      { ...kaveri, meanings: ["friend"] },
      "1",
    );

    expect(item).toMatchObject({
      wordId: kaveri.id,
      word: "kaveri",
      sentenceBefore: "Tapasin vanhan ",
      sentenceAfter: " kahvilassa eilen.",
      aiGenerated: true,
    });
    expect(item?.acceptableAnswers).toContain("kaverini");
    expect(answersMatchAny("kaverini", item?.acceptableAnswers ?? [])).toBe(true);
  });

  it("rejects a sentence with no blank, multiple blanks, or a leaked answer", () => {
    expect(
      validateFillBlankExercise(
        {
          sentence: "Tapasin vanhan kaverini kahvilassa eilen.",
          answer: "kaverini",
        },
        kaveri,
      ),
    ).toBeNull();

    expect(
      validateFillBlankExercise(
        {
          sentence: `Tapasin ${FILL_BLANK_PLACEHOLDER} ja ${FILL_BLANK_PLACEHOLDER} eilen.`,
          answer: "kaverini",
        },
        kaveri,
      ),
    ).toBeNull();

    expect(
      sentenceLeaksAnswer(
        `Kaveri tapasi vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa.`,
        "kaveri",
      ),
    ).toBe(true);
    expect(
      validateFillBlankExercise(
        {
          sentence: `Kaveri tapasi vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa.`,
          answer: "kaverini",
        },
        kaveri,
      ),
    ).toBeNull();
  });

  it("rejects a copied example sentence", () => {
    expect(
      validateFillBlankExercise(
        {
          sentence: `Minun ${FILL_BLANK_PLACEHOLDER} asuu Helsingissä.`,
          answer: "kaverini",
        },
        kaveri,
      ),
    ).toBeNull();
  });

  it("allows the same word more than once when sentences differ", () => {
    const words = [kaveri, { ...kaveri, id: "word-kaveri" }];
    const selected = selectValidFillBlankExercises(
      [
        {
          wordId: kaveri.id,
          sentence: `Tapasin vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa eilen.`,
          answer: "kaverini",
        },
        {
          wordId: kaveri.id,
          sentence: `Uusi ${FILL_BLANK_PLACEHOLDER} muutti naapuriin viime viikolla.`,
          answer: "kaveri",
        },
      ],
      words,
    );

    expect(selected).toHaveLength(2);
  });

  it("parses a result payload and keeps only valid exercises", () => {
    const parsed = exerciseAiResultSchema.parse({
      exercises: [
        {
          wordId: kaveri.id,
          type: "fill-in-blank",
          sentence: `Tapasin vanhan ${FILL_BLANK_PLACEHOLDER} kahvilassa eilen.`,
          answer: "kaverini",
          baseWord: "kaveri",
        },
        {
          wordId: kaveri.id,
          sentence: "This has no blank.",
          answer: "kaveri",
        },
      ],
    });

    expect(selectValidFillBlankExercises(parsed.exercises, [kaveri])).toHaveLength(1);
  });
});

describe("fill-in-blank AI word picking", () => {
  it("repeats words to fill a batch of 10", () => {
    const words = [
      flashcard({ id: "1", word: "kaveri" }),
      flashcard({ id: "2", word: "talo" }),
      flashcard({ id: "3", word: "kissa" }),
    ];

    const picked = pickFillBlankAiWords(words, 10);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((word) => word.id)).size).toBe(3);
  });

  it("puts existing examples into avoidSentences", () => {
    const input = toExerciseAiWord(
      flashcard({ id: "1", word: "kaveri" }),
      ["Tapasin vanhan kaverini kahvilassa eilen."],
    );

    expect(input.avoidSentences).toEqual([
      "Minun kaverini asuu Helsingissä.",
      "Tapasin vanhan kaverini kahvilassa eilen.",
    ]);
  });
});

describe("blank splitting", () => {
  it("splits a sentence on a single placeholder", () => {
    expect(splitSentenceAtBlank(`Minulla on uusi ${FILL_BLANK_PLACEHOLDER}.`)).toEqual({
      before: "Minulla on uusi ",
      after: ".",
    });
  });
});
