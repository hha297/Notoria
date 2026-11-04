import { describe, expect, it } from "vitest";
import { isSameWordToken } from "@/lib/flashcards/highlight-lemma";

describe("isSameWordToken", () => {
  it("matches the lemma ignoring trailing punctuation", () => {
    expect(isSameWordToken("sitten,", "sitten")).toBe(true);
    expect(isSameWordToken("Sitten", "sitten")).toBe(true);
  });

  it("does not match a different stem", () => {
    expect(isSameWordToken("sittenkin", "sitten")).toBe(false);
    expect(isSameWordToken("talo", "talossa")).toBe(false);
  });
});
