import { describe, expect, it } from "vitest";
import {
  countWordsWithTag,
  filterWordsForTagManager,
  isTagManagerTagId,
  isWordSelectableForTagOperation,
  partitionSelectedForTag,
  selectionOperationForTag,
  storedTagMatchesManagerTag,
  tagManagerGroupForId,
  wordHasTag,
} from "@/lib/vocabulary/tag-manager";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

function word(
  id: string,
  text: string,
  tags: string[],
  meaning = "meaning",
): VocabularyWordRow {
  return {
    id,
    word: text,
    partOfSpeech: "noun",
    updatedAt: new Date().toISOString(),
    meanings: [
      { id: `${id}-m`, meaning, isPrimary: true, sortOrder: 0 },
    ],
    examples: [],
    synonymRefs: [],
    tags: tags.map((tag, index) => ({ id: `${id}-t${index}`, tag })),
  };
}

describe("tag manager helpers", () => {
  it("accepts only Aihe and Käyttö taxonomy ids", () => {
    expect(isTagManagerTagId("travel")).toBe(true);
    expect(isTagManagerTagId("formal")).toBe(true);
    expect(isTagManagerTagId("a1")).toBe(false);
    expect(isTagManagerTagId("custom:YKI")).toBe(false);
    expect(tagManagerGroupForId("travel")).toBe("topic");
    expect(tagManagerGroupForId("formal")).toBe("grammar");
  });

  it("counts and detects membership", () => {
    const words = [
      word("1", "matka", ["travel"]),
      word("2", "koti", ["home_housing"]),
      word("3", "bussi", ["travel", "formal"]),
    ];
    expect(countWordsWithTag(words, "travel")).toBe(2);
    expect(wordHasTag(words[0]!, "travel")).toBe(true);
    expect(wordHasTag(words[1]!, "travel")).toBe(false);
  });

  it("filters by search only", () => {
    const words = [
      word("1", "matka", ["travel"], "trip"),
      word("2", "koti", [], "home"),
      word("3", "bussi", ["travel"], "bus"),
    ];

    expect(
      filterWordsForTagManager(words, {
        tagId: "travel",
        search: "",
      }).map((item) => item.id),
    ).toEqual(["1", "2", "3"]);

    expect(
      filterWordsForTagManager(words, {
        tagId: "travel",
        search: "home",
      }).map((item) => item.id),
    ).toEqual(["2"]);

    expect(
      filterWordsForTagManager(words, {
        tagId: "travel",
        search: "bus",
      }).map((item) => item.id),
    ).toEqual(["3"]);
  });

  it("matches legacy stored aliases to the current Tag Manager tag", () => {
    expect(storedTagMatchesManagerTag("daily", "everyday_life")).toBe(true);
    expect(storedTagMatchesManagerTag("Everyday life", "everyday_life")).toBe(
      true,
    );
    expect(storedTagMatchesManagerTag("everyday_life", "everyday_life")).toBe(
      true,
    );
    expect(storedTagMatchesManagerTag("travel", "everyday_life")).toBe(false);
    expect(storedTagMatchesManagerTag("puhekieli", "spoken")).toBe(true);
  });

  it("locks Add/Remove from the first selected word", () => {
    const words = [
      word("a", "airport", ["travel"]),
      word("b", "banana", ["food"]),
    ];

    expect(selectionOperationForTag(words, [], "travel")).toBeNull();
    expect(selectionOperationForTag(words, ["b"], "travel")).toBe("add");
    expect(selectionOperationForTag(words, ["a"], "travel")).toBe("remove");

    expect(isWordSelectableForTagOperation(words[0]!, "travel", null)).toBe(
      true,
    );
    expect(isWordSelectableForTagOperation(words[0]!, "travel", "add")).toBe(
      false,
    );
    expect(isWordSelectableForTagOperation(words[1]!, "travel", "add")).toBe(
      true,
    );
    expect(isWordSelectableForTagOperation(words[0]!, "travel", "remove")).toBe(
      true,
    );
    expect(isWordSelectableForTagOperation(words[1]!, "travel", "remove")).toBe(
      false,
    );
  });

  it("partitions selected words into add vs remove for the current tag", () => {
    const words = [
      word("a", "airport", ["travel"]),
      word("b", "hotel", ["travel"]),
      word("c", "banana", ["food"]),
      word("d", "doctor", []),
    ];

    expect(
      partitionSelectedForTag(words, ["a", "b", "c", "d"], "travel"),
    ).toEqual({
      toAdd: ["c", "d"],
      toRemove: ["a", "b"],
    });

    expect(partitionSelectedForTag(words, ["c", "d"], "travel")).toEqual({
      toAdd: ["c", "d"],
      toRemove: [],
    });

    expect(partitionSelectedForTag(words, ["a", "b"], "travel")).toEqual({
      toAdd: [],
      toRemove: ["a", "b"],
    });

    expect(partitionSelectedForTag(words, ["a", "c"], "food")).toEqual({
      toAdd: ["a"],
      toRemove: ["c"],
    });
  });
});
