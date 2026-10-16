import { describe, expect, it } from "vitest";
import { hintInitialLetter, partialAnswerHint } from "@/lib/exercises/hint";

describe("exercise hints", () => {
  it("returns the first letter uppercased", () => {
    expect(hintInitialLetter("veli")).toBe("V");
    expect(hintInitialLetter("")).toBe("");
  });

  it("masks the answer with a short visible prefix", () => {
    expect(partialAnswerHint("veli")).toBe("ve··");
    expect(partialAnswerHint("a")).toBe("·");
    expect(partialAnswerHint("")).toBe("");
    expect(partialAnswerHint("  hello world  ")).toBe("hel·· ·····");
  });
});
