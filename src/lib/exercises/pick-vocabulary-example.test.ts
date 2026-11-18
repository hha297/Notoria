import { describe, expect, it } from "vitest";
import {
  pickVocabularyExample,
  reconstructFillBlankSentence,
} from "@/lib/exercises/pick-vocabulary-example";

describe("pickVocabularyExample", () => {
  it("returns null when there are no examples", () => {
    expect(pickVocabularyExample(undefined)).toBeNull();
    expect(pickVocabularyExample([])).toBeNull();
  });

  it("returns the first usable example", () => {
    expect(
      pickVocabularyExample([
        { sentence: "  ", meaning: null, meaningId: null },
        {
          sentence: "I imagine the scene.",
          meaning: "Kuvittelen kohtauksen.",
          meaningId: null,
        },
      ]),
    ).toEqual({
      sentence: "I imagine the scene.",
      meaning: "Kuvittelen kohtauksen.",
      meaningId: null,
    });
  });

  it("prefers a distinct example over the exercise stem", () => {
    const picked = pickVocabularyExample(
      [
        { sentence: "I imagine the scene.", meaning: null, meaningId: null },
        {
          sentence: "Can you imagine that?",
          meaning: "Voitko kuvitella sen?",
          meaningId: null,
        },
      ],
      { excludeSentence: "I imagine the scene." },
    );
    expect(picked?.sentence).toBe("Can you imagine that?");
  });

  it("omits a lone stem-only example without translation", () => {
    expect(
      pickVocabularyExample(
        [{ sentence: "I imagine the scene.", meaning: null, meaningId: null }],
        { excludeSentence: "I imagine the scene." },
      ),
    ).toBeNull();
  });

  it("keeps a stem example when a translation exists", () => {
    expect(
      pickVocabularyExample(
        [
          {
            sentence: "I imagine the scene.",
            meaning: "Kuvittelen kohtauksen.",
            meaningId: null,
          },
        ],
        { excludeSentence: "I imagine the scene." },
      ),
    ).toEqual({
      sentence: "I imagine the scene.",
      meaning: "Kuvittelen kohtauksen.",
      meaningId: null,
    });
  });

  it("sense-scopes examples and never falls back to unassigned", () => {
    const entries = [
      {
        sentence: "Unassigned sentence.",
        meaning: "orphan",
        meaningId: null,
      },
      {
        sentence: "Sense A sentence.",
        meaning: "a",
        meaningId: "sense-a",
      },
      {
        sentence: "Sense B sentence.",
        meaning: "b",
        meaningId: "sense-b",
      },
    ];

    expect(
      pickVocabularyExample(entries, { meaningId: "sense-a" })?.sentence,
    ).toBe("Sense A sentence.");
    expect(pickVocabularyExample(entries, { meaningId: "sense-z" })).toBeNull();
  });

  it("allows unassigned examples when meaningId is omitted", () => {
    expect(
      pickVocabularyExample([
        {
          sentence: "Word-level example.",
          meaning: null,
          meaningId: null,
        },
      ])?.sentence,
    ).toBe("Word-level example.");
  });
});

describe("reconstructFillBlankSentence", () => {
  it("joins before, answer, and after with sensible spacing", () => {
    expect(
      reconstructFillBlankSentence({
        before: "Can you ",
        answer: "imagine",
        after: " that?",
      }),
    ).toBe("Can you imagine that?");
  });
});
