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
        { sentence: "  ", meaning: null },
        { sentence: "I imagine the scene.", meaning: "Kuvittelen kohtauksen." },
      ]),
    ).toEqual({
      sentence: "I imagine the scene.",
      meaning: "Kuvittelen kohtauksen.",
    });
  });

  it("prefers a distinct example over the exercise stem", () => {
    const picked = pickVocabularyExample(
      [
        { sentence: "I imagine the scene.", meaning: null },
        { sentence: "Can you imagine that?", meaning: "Voitko kuvitella sen?" },
      ],
      { excludeSentence: "I imagine the scene." },
    );
    expect(picked?.sentence).toBe("Can you imagine that?");
  });

  it("omits a lone stem-only example without translation", () => {
    expect(
      pickVocabularyExample(
        [{ sentence: "I imagine the scene.", meaning: null }],
        { excludeSentence: "I imagine the scene." },
      ),
    ).toBeNull();
  });

  it("keeps a stem example when a translation exists", () => {
    expect(
      pickVocabularyExample(
        [{ sentence: "I imagine the scene.", meaning: "Kuvittelen kohtauksen." }],
        { excludeSentence: "I imagine the scene." },
      ),
    ).toEqual({
      sentence: "I imagine the scene.",
      meaning: "Kuvittelen kohtauksen.",
    });
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
