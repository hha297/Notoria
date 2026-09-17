import { describe, expect, it } from "vitest";
import { pickDistinctContextualWords } from "@/lib/exercises/contextual-word-pick";

describe("pickDistinctContextualWords", () => {
  const words = [
    { id: "1", word: "hana" },
    { id: "2", word: "viemäri" },
    { id: "3", word: "roska" },
    { id: "4", word: "porras" },
    { id: "5", word: "komero" },
    { id: "6", word: "Hana" }, // same surface form
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
