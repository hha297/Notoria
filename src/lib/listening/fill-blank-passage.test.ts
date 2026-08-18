import { describe, expect, it } from "vitest";
import { mergeFillBlankQuestions } from "@/lib/listening/fill-blank-passage";

describe("mergeFillBlankQuestions", () => {
  it("keeps a single full-transcript passage intact", () => {
    const passage = [
      "Minun mielestäni ______ asuinalueella pitäisi olla ______ palvelut.",
      "",
      "On ______, että kaikilla ihmisillä on lähellä ruokakauppa.",
    ].join("\n");

    expect(
      mergeFillBlankQuestions([
        {
          sentenceWithBlanks: passage,
          blanks: ["kaikilla", "samanlaiset", "tärkeää"],
        },
      ]),
    ).toEqual({
      sentenceWithBlanks: passage,
      blanks: ["kaikilla", "samanlaiset", "tärkeää"],
      speaker: undefined,
    });
  });

  it("joins split questions into one passage", () => {
    expect(
      mergeFillBlankQuestions([
        {
          speaker: "Matti",
          sentenceWithBlanks: "Minun mielestäni ______.",
          blanks: ["kaikilla"],
        },
        {
          speaker: "Anna",
          sentenceWithBlanks: "On ______.",
          blanks: ["tärkeää"],
        },
      ]),
    ).toEqual({
      sentenceWithBlanks: "Matti: Minun mielestäni ______. Anna: On ______.",
      blanks: ["kaikilla", "tärkeää"],
      speaker: undefined,
    });
  });
});
