import { describe, expect, it } from "vitest";
import {
  FILL_BLANK_GENERATOR_PROMPT,
  fillBlankUserPayload,
} from "@/lib/exercises/ai-prompt";
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
import {
  pickFillBlankAiWords,
  toExerciseAiWord,
} from "@/lib/exercises/ai-words";
import { answersMatchAny } from "@/lib/exercises/utils";
import type { FlashcardWord } from "@/types/flashcards";

const AVOID_SENTENCE = "I already used alpha in this avoided sentence.";
const SAMPLE_BLANK = `I met an old ${FILL_BLANK_PLACEHOLDER} at the cafe yesterday.`;

const alpha: ExerciseAiWordInput = {
  id: "word-alpha",
  word: "alpha",
  meaning: "abc",
  partOfSpeech: "noun",
  topic: null,
  avoidSentences: [AVOID_SENTENCE],
};

function flashcard(
  overrides: Partial<FlashcardWord> & Pick<FlashcardWord, "id" | "word">,
): FlashcardWord {
  return {
    partOfSpeech: "noun",
    synonyms: null,
    notes: null,
    status: "NEW",
    createdAt: "2026-01-01T00:00:00.000Z",
    meanings: ["abc"],
    examples: [AVOID_SENTENCE],
    tags: [],
    ...overrides,
  };
}

describe("fill-in-blank AI request schema", () => {
  it("accepts a 10-word fill-in-blank request with difficulty and avoid sentences", () => {
    const parsed = exerciseAiRequestSchema.parse({
      exerciseType: "fill-in-blank",
      language: "xx",
      level: "A2",
      difficulty: "medium",
      words: Array.from({ length: 10 }, (_, index) => ({
        id: `word-${index}`,
        word: "alpha",
        meaning: "abc",
        avoidSentences: [AVOID_SENTENCE],
      })),
    });

    expect(parsed.exerciseType).toBe("fill-in-blank");
    expect(parsed.level).toBe("a2");
    expect(parsed.difficulty).toBe("medium");
    expect(parsed.words).toHaveLength(FILL_BLANK_AI_BATCH);
    expect(parsed.words[0]?.avoidSentences).toEqual([AVOID_SENTENCE]);
  });

  it("rejects other exercise types", () => {
    const parsed = exerciseAiRequestSchema.safeParse({
      exerciseType: "translation",
      words: [{ id: "1", word: "alpha" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than 10 words", () => {
    const parsed = exerciseAiRequestSchema.safeParse({
      exerciseType: "fill-in-blank",
      words: Array.from({ length: 11 }, (_, index) => ({
        id: `word-${index}`,
        word: "alpha",
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
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("exerciseDifficulty");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("instruction");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain(
      "Do NOT invent a specific grammar topic",
    );
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("meaningful context");
    expect(FILL_BLANK_GENERATOR_PROMPT).toContain("I like ________.");
  });

  it("includes structured difficulty guidance in the user payload", () => {
    const payload = fillBlankUserPayload({
      languageHint: "StudyLang",
      languageCode: "xx",
      level: "a2",
      difficulty: "hard",
      uiLanguage: "English",
      words: [alpha],
    });

    expect(payload.exerciseDifficulty).toBe("hard");
    expect(payload).not.toHaveProperty("sentenceComplexityHint");
    expect(payload.difficultyGuidance).toContain("Hard");
    expect(payload.fillBlankGuidance).toContain("Fill in the Blank");
  });

  it("sends examples only as sentences to avoid, never as a source list", () => {
    const payload = fillBlankUserPayload({
      languageHint: "StudyLang",
      languageCode: "xx",
      level: "a2",
      uiLanguage: "English",
      words: [alpha],
    });

    expect(payload.exerciseDifficulty).toBe("easy");
    expect(payload.words[0]).toEqual({
      wordId: "word-alpha",
      lemma: "alpha",
      word: "alpha",
      meaning: "abc",
      partOfSpeech: "noun",
      topic: null,
      avoidSentences: [AVOID_SENTENCE],
    });
    expect(payload.words[0]).not.toHaveProperty("examples");
    expect(payload.words[0]).not.toHaveProperty("existingQuestions");
  });
});

describe("fill-in-blank AI validation", () => {
  it("accepts one blank and an inflected answer", () => {
    const validated = validateFillBlankExercise(
      {
        wordId: alpha.id,
        sentence: SAMPLE_BLANK,
        answer: "alphas",
        baseWord: "alpha",
      },
      alpha,
    );

    expect(validated).not.toBeNull();
    expect(validated!.answer).toBe("alphas");
    expect(validated!.baseWord).toBe("alpha");
    expect(countFillBlanks(validated!.sentence)).toBe(1);
    expect(isRelatedWordForm("alpha", "alphas")).toBe(true);
    expect(answersMatchAny("alphas", [validated!.answer])).toBe(true);
    expect(answersMatchAny("alpha", [validated!.answer])).toBe(false);
  });

  it("maps a blanked sentence onto the existing fill-in-blank item shape", () => {
    const item = fillBlankExerciseToItem(
      {
        wordId: alpha.id,
        sentence: SAMPLE_BLANK,
        answer: "alphas",
        baseWord: "alpha",
      },
      { ...alpha, meanings: ["abc"] },
      "1",
    );

    expect(item).toMatchObject({
      wordId: alpha.id,
      word: "alpha",
      sentenceBefore: "I met an old ",
      sentenceAfter: " at the cafe yesterday.",
      aiGenerated: true,
    });
    expect(item?.acceptableAnswers).toContain("alphas");
    expect(answersMatchAny("alphas", item?.acceptableAnswers ?? [])).toBe(true);
    expect(answersMatchAny("alpha", item?.acceptableAnswers ?? [])).toBe(false);
  });

  it("maps sentenceMeaning onto the fill-in-blank item", () => {
    const item = fillBlankExerciseToItem(
      {
        wordId: alpha.id,
        sentence: SAMPLE_BLANK,
        answer: "alphas",
        baseWord: "alpha",
        sentenceMeaning: "Sentence gloss in the UI language.",
      },
      { ...alpha, meanings: ["abc"] },
      "meaning-1",
    );

    expect(item?.sentenceMeaning).toBe("Sentence gloss in the UI language.");
  });

  it("rejects fill-blank AI items without a vocabulary meaning hint", () => {
    expect(
      fillBlankExerciseToItem(
        {
          wordId: alpha.id,
          sentence: SAMPLE_BLANK,
          answer: "alphas",
          baseWord: "alpha",
        },
        { ...alpha, meaning: null, meanings: [] },
        "no-hint",
      ),
    ).toBeNull();

    expect(
      validateFillBlankExercise(
        {
          wordId: alpha.id,
          sentence: SAMPLE_BLANK,
          answer: "alphas",
          baseWord: "alpha",
        },
        { ...alpha, meaning: null },
      ),
    ).toBeNull();
  });

  it("rejects a sentence with no blank, multiple blanks, or a leaked answer", () => {
    expect(
      validateFillBlankExercise(
        {
          sentence: "I met an old alphas at the cafe yesterday.",
          answer: "alphas",
        },
        alpha,
      ),
    ).toBeNull();

    expect(
      validateFillBlankExercise(
        {
          sentence: `I saw ${FILL_BLANK_PLACEHOLDER} and ${FILL_BLANK_PLACEHOLDER} yesterday.`,
          answer: "alphas",
        },
        alpha,
      ),
    ).toBeNull();

    expect(
      sentenceLeaksAnswer(
        `alpha met an old ${FILL_BLANK_PLACEHOLDER} at the cafe.`,
        "alpha",
      ),
    ).toBe(true);
    expect(
      validateFillBlankExercise(
        {
          sentence: `alpha met an old ${FILL_BLANK_PLACEHOLDER} at the cafe.`,
          answer: "alphas",
        },
        alpha,
      ),
    ).toBeNull();
  });

  it("rejects a copied example sentence", () => {
    expect(
      validateFillBlankExercise(
        {
          sentence: `I already used ${FILL_BLANK_PLACEHOLDER} in this avoided sentence.`,
          answer: "alpha",
        },
        alpha,
      ),
    ).toBeNull();
  });

  it("allows the same word more than once when sentences differ", () => {
    const words = [alpha, { ...alpha, id: "word-alpha" }];
    const selected = selectValidFillBlankExercises(
      [
        {
          wordId: alpha.id,
          sentence: SAMPLE_BLANK,
          answer: "alphas",
        },
        {
          wordId: alpha.id,
          sentence: `A new ${FILL_BLANK_PLACEHOLDER} moved in last week.`,
          answer: "alpha",
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
          wordId: alpha.id,
          type: "fill-in-blank",
          sentence: SAMPLE_BLANK,
          answer: "alphas",
          baseWord: "alpha",
        },
        {
          wordId: alpha.id,
          sentence: "This has no blank.",
          answer: "alpha",
        },
      ],
    });

    expect(
      selectValidFillBlankExercises(parsed.exercises, [alpha]),
    ).toHaveLength(1);
  });
});

describe("fill-in-blank AI word picking", () => {
  it("repeats words to fill a batch of 10", () => {
    const words = [
      flashcard({ id: "1", word: "alpha" }),
      flashcard({ id: "2", word: "beta" }),
      flashcard({ id: "3", word: "gamma" }),
    ];

    const picked = pickFillBlankAiWords(words, 10);
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((word) => word.id)).size).toBe(3);
  });

  it("puts existing examples into avoidSentences", () => {
    const input = toExerciseAiWord(flashcard({ id: "1", word: "alpha" }), [
      "Another avoided alpha sentence from before.",
    ]);

    expect(input.avoidSentences).toEqual([
      AVOID_SENTENCE,
      "Another avoided alpha sentence from before.",
    ]);
  });
});

describe("blank splitting", () => {
  it("splits a sentence on a single placeholder", () => {
    expect(
      splitSentenceAtBlank(`I have a new ${FILL_BLANK_PLACEHOLDER}.`),
    ).toEqual({
      before: "I have a new ",
      after: ".",
    });
  });
});
