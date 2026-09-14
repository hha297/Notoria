import { describe, expect, it } from "vitest";
import {
  groupByPartOfSpeech,
  normalizePartOfSpeechKey,
} from "@/lib/vocabulary/export/group-rows";

describe("groupByPartOfSpeech", () => {
  it("merges noun/Noun/NOUN and sorts words alphabetically", () => {
    const groups = groupByPartOfSpeech(
      [
        { word: "Välivuosi", pos: "NOUN" },
        { word: "aika", pos: "noun" },
        { word: "oppia", pos: "Verb" },
        { word: "hyvä", pos: "adjective" },
        { word: "extra", pos: "" },
      ],
      (item) => item.pos,
      (item) => item.word,
      "Uncategorized",
    );

    expect(groups.map((group) => group.key)).toEqual([
      "noun",
      "verb",
      "adjective",
      "",
    ]);
    expect(groups[0]?.title).toBe("Noun");
    expect(groups[0]?.items.map((item) => item.word)).toEqual([
      "aika",
      "Välivuosi",
    ]);
  });

  it("normalizes empty placeholders", () => {
    expect(normalizePartOfSpeechKey("—")).toBe("");
    expect(normalizePartOfSpeechKey("  Noun ")).toBe("noun");
  });
});
