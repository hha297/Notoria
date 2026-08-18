import { describe, expect, it } from "vitest";
import {
  formatSynonymNames,
  matchLegacySynonyms,
  orderedSynonymPair,
  parseLegacySynonymNames,
  primaryMeaningText,
  synonymPeerId,
  uniqueSynonymIds,
} from "@/lib/vocabulary/synonyms";

describe("vocabulary synonyms", () => {
  it("parses comma-separated legacy names", () => {
    expect(parseLegacySynonymNames("Puppy, doggy;  pup")).toEqual([
      "Puppy",
      "doggy",
      "pup",
    ]);
    expect(parseLegacySynonymNames("")).toEqual([]);
  });

  it("orders synonym pairs canonically", () => {
    expect(orderedSynonymPair("b", "a")).toEqual({
      wordId: "a",
      synonymId: "b",
    });
    expect(orderedSynonymPair("a", "a")).toEqual({
      wordId: "a",
      synonymId: "a",
    });
  });

  it("drops duplicate and self ids", () => {
    expect(uniqueSynonymIds(["a", "b", "a", "c"], "b")).toEqual(["a", "c"]);
  });

  it("matches legacy names onto existing words", () => {
    const options = [
      { id: "1", word: "Happy", meaning: "glad" },
      { id: "2", word: "Glad", meaning: "happy" },
    ];
    expect(matchLegacySynonyms(["happy", "joyful"], options, "2")).toEqual({
      matched: [{ id: "1", word: "Happy", meaning: "glad" }],
      unmatched: ["joyful"],
    });
  });

  it("formats synonym names for display", () => {
    expect(
      formatSynonymNames([{ word: "Happy" }, { word: " Glad " }]),
    ).toBe("Happy, Glad");
  });

  it("picks the first primary meaning", () => {
    expect(
      primaryMeaningText([
        { meaning: "secondary", isPrimary: false, sortOrder: 0 },
        { meaning: "main", isPrimary: true, sortOrder: 1 },
      ]),
    ).toBe("main");
  });

  it("returns the peer id of a synonym pair", () => {
    expect(
      synonymPeerId("a", { wordId: "a", synonymId: "b" }),
    ).toBe("b");
    expect(
      synonymPeerId("b", { wordId: "a", synonymId: "b" }),
    ).toBe("a");
  });
});
