import { describe, expect, it } from "vitest";
import {
  hintInitialLetter,
  isSpellingMaskHint,
  partialAnswerHint,
  spellingHintKeepCount,
} from "@/lib/exercises/hint";

describe("exercise hints", () => {
  it("returns the first letter uppercased", () => {
    expect(hintInitialLetter("veli")).toBe("V");
    expect(hintInitialLetter("")).toBe("");
  });

  it("keeps fewer characters for short answers", () => {
    expect(spellingHintKeepCount(1)).toBe(0);
    expect(spellingHintKeepCount(2)).toBe(1);
    expect(spellingHintKeepCount(3)).toBe(1);
    expect(spellingHintKeepCount(4)).toBe(3);
    expect(spellingHintKeepCount(7)).toBe(3);
  });

  it("masks the answer with a short visible prefix and underscores", () => {
    expect(partialAnswerHint("mistään")).toBe("mis____");
    expect(partialAnswerHint("jos")).toBe("j__");
    expect(partialAnswerHint("veli")).toBe("vel_");
    expect(partialAnswerHint("a")).toBe("_");
    expect(partialAnswerHint("")).toBe("");
    expect(partialAnswerHint("  hello world  ")).toBe("hel__ _____");
    expect(partialAnswerHint("äiti")).toBe("äit_");
  });

  it("never returns the complete answer", () => {
    for (const answer of ["x", "ab", "jos", "talo", "mistään", "well-known"]) {
      const mask = partialAnswerHint(answer);
      expect(mask.toLocaleLowerCase()).not.toBe(answer.toLocaleLowerCase());
    }
  });

  it("recognizes deterministic spelling masks", () => {
    expect(isSpellingMaskHint("mis____", ["mistään"])).toBe(true);
    expect(isSpellingMaskHint("Starts with m", ["mistään"])).toBe(false);
  });
});
