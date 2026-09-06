import { describe, expect, it } from "vitest";
import { ensureSentenceMeanings } from "@/lib/exercises/sentence-meaning";

describe("ensureSentenceMeanings", () => {
  it("reuses existing meanings and skips AI when every item already has one", async () => {
    const items = [
      { id: "1", sentence: "Kissa nukkuu.", sentenceMeaning: "The cat is sleeping." },
      { id: "2", sentence: "Koira juoksee.", sentenceMeaning: "The dog is running." },
    ];

    const result = await ensureSentenceMeanings(items, {
      uiLocale: "en",
      getSentence: (item) => item.sentence,
      getMeaning: (item) => item.sentenceMeaning,
      setMeaning: (item, sentenceMeaning) => ({ ...item, sentenceMeaning }),
      getFallbackMeaning: () => {
        throw new Error("fallback should not run when meanings exist");
      },
    });

    expect(result).toEqual(items);
  });

  it("falls back to vocabulary meaning when sentence cannot be glossed", async () => {
    const result = await ensureSentenceMeanings(
      [{ id: "1", sentence: "", sentenceMeaning: null as string | null }],
      {
        uiLocale: "en",
        getSentence: (item) => item.sentence,
        getMeaning: (item) => item.sentenceMeaning,
        setMeaning: (item, sentenceMeaning) => ({ ...item, sentenceMeaning }),
        getFallbackMeaning: () => "durable / sustainable",
      },
    );

    expect(result[0]?.sentenceMeaning).toBe("durable / sustainable");
  });

  it("does not overwrite an existing meaning with the fallback", async () => {
    const result = await ensureSentenceMeanings(
      [{ id: "1", sentence: "", sentenceMeaning: "already there" }],
      {
        uiLocale: "en",
        getSentence: (item) => item.sentence,
        getMeaning: (item) => item.sentenceMeaning,
        setMeaning: (item, sentenceMeaning) => ({ ...item, sentenceMeaning }),
        getFallbackMeaning: () => "fallback",
      },
    );

    expect(result[0]?.sentenceMeaning).toBe("already there");
  });
});
