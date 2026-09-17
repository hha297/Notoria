import { describe, expect, it } from "vitest";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";

describe("pickDistinctContextualWords", () => {
  const words = [
    { id: "1", word: "alpha" },
    { id: "2", word: "beta" },
    { id: "3", word: "gamma" },
    { id: "4", word: "delta" },
    { id: "5", word: "epsilon" },
    { id: "6", word: "Alpha" }, // same surface form
  ];

  it("spreads across distinct surface forms before reuse", () => {
    const picked = pickDistinctContextualWords(words, 5);
    expect(picked).toHaveLength(5);
    const forms = picked.map((word) => word.word.toLowerCase());
    expect(new Set(forms).size).toBe(5);
  });

  it("prefers softPrefer ids without collapsing the batch", () => {
    const picked = pickDistinctContextualWords(words, 4, {
      getWordId: (item) => item.id,
      getWordForm: (item) => item.word,
      softPreferWordIds: ["3"],
      softAvoidWordIds: ["1"],
    });
    expect(picked.some((word) => word.id === "3")).toBe(true);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((word) => word.id)).size).toBe(4);
  });
});
