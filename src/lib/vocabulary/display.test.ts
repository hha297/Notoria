import { describe, expect, it } from "vitest";
import {
  buildPageList,
  filterVocabularyWords,
  findDifficultyTag,
  groupVocabularyWordsByPos,
  previewMeanings,
  sortVocabularyWords,
  visibleTags,
} from "@/lib/vocabulary/display";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

function word(
  overrides: Partial<VocabularyWordRow> & Pick<VocabularyWordRow, "id" | "word">,
): VocabularyWordRow {
  return {
    partOfSpeech: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    meanings: [],
    examples: [],
    synonymRefs: [],
    tags: [],
    ...overrides,
  };
}

describe("previewMeanings", () => {
  it("caps previewed meanings and reports extras", () => {
    const item = word({
      id: "1",
      word: "koira",
      meanings: Array.from({ length: 7 }, (_, index) => ({
        id: String(index),
        meaning: `m${index + 1}`,
        sortOrder: index,
      })),
    });

    expect(previewMeanings(item)).toEqual({
      shown: ["m1", "m2", "m3", "m4", "m5"],
      extra: 2,
      all: ["m1", "m2", "m3", "m4", "m5", "m6", "m7"],
    });
  });
});

describe("findDifficultyTag", () => {
  it("prefers the lowest CEFR level when several exist", () => {
    const tags = [
      { id: "1", tag: "b1" },
      { id: "2", tag: "a2" },
      { id: "3", tag: "grammar" },
    ];
    expect(findDifficultyTag(tags)?.tag).toBe("a2");
  });
});

describe("visibleTags", () => {
  it("excludes the featured tag and reports overflow", () => {
    const tags = [
      { id: "1", tag: "a1" },
      { id: "2", tag: "grammar" },
      { id: "3", tag: "work" },
      { id: "4", tag: "custom:extra" },
    ];
    const result = visibleTags(tags, { excludeTag: "a1", limit: 2 });
    expect(result.shown.map((tag) => tag.tag)).toEqual(["grammar", "work"]);
    expect(result.extra.map((tag) => tag.tag)).toEqual(["custom:extra"]);
  });
});

describe("filter and sort", () => {
  const words = [
    word({
      id: "1",
      word: "Ajokortti",
      partOfSpeech: "noun",
      updatedAt: "2026-02-01T00:00:00.000Z",
      meanings: [{ id: "m1", meaning: "Driving licence", sortOrder: 0 }],
      tags: [{ id: "t1", tag: "a1" }],
    }),
    word({
      id: "2",
      word: "Juosta",
      partOfSpeech: "verb",
      updatedAt: "2026-03-01T00:00:00.000Z",
      meanings: [{ id: "m2", meaning: "To run", sortOrder: 0 }],
      tags: [{ id: "t2", tag: "grammar" }],
    }),
  ];

  it("filters by search, part of speech, and tags together", () => {
    expect(
      filterVocabularyWords(words, {
        search: "driv",
        partOfSpeechFilter: ["noun"],
        tagFilter: ["a1"],
      }).map((item) => item.id),
    ).toEqual(["1"]);
  });

  it("sorts by word without mutating the source", () => {
    const sorted = sortVocabularyWords(words, "word", "asc");
    expect(sorted.map((item) => item.word)).toEqual(["Ajokortti", "Juosta"]);
    expect(words.map((item) => item.word)).toEqual(["Ajokortti", "Juosta"]);
  });
});

describe("groupVocabularyWordsByPos", () => {
  it("keeps part-of-speech order and collects uncategorized last", () => {
    const groups = groupVocabularyWordsByPos([
      word({ id: "1", word: "a", partOfSpeech: "verb" }),
      word({ id: "2", word: "b", partOfSpeech: null }),
      word({ id: "3", word: "c", partOfSpeech: "noun" }),
    ]);
    expect(groups.map((group) => group.key)).toEqual(["noun", "verb", "__none__"]);
  });
});

describe("buildPageList", () => {
  it("inserts ellipses for large page ranges", () => {
    expect(buildPageList(5, 12)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 12]);
  });
});
