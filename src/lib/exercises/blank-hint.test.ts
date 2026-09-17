import { describe, expect, it } from "vitest";
import {
  isBlankMeaningHintConsistent,
  resolveBlankMeaningHint,
  resolveValidBlankMeaningHint,
  withBlankMeaningHint,
  wordHasBlankMeaningHint,
} from "@/lib/exercises/blank-hint";

describe("blank-hint", () => {
  it("resolves the first non-empty meaning", () => {
    expect(resolveBlankMeaningHint(["", "  ", "abc"], "ignored")).toBe("abc");
    expect(resolveBlankMeaningHint([], "fallback")).toBe("fallback");
    expect(resolveBlankMeaningHint([], null, "  ")).toBeNull();
  });

  it("rejects empty or spoiler hints", () => {
    expect(
      isBlankMeaningHintConsistent({
        hint: "abc",
        answer: "alphas",
        baseWord: "alpha",
        wordMeanings: ["abc"],
      }),
    ).toBe(true);

    expect(
      isBlankMeaningHintConsistent({
        hint: "alphas",
        answer: "alphas",
        baseWord: "alpha",
        wordMeanings: ["alphas"],
      }),
    ).toBe(false);

    expect(
      isBlankMeaningHintConsistent({
        hint: "alpha",
        answer: "alphas",
        baseWord: "alpha",
        wordMeanings: ["alpha"],
      }),
    ).toBe(false);

    expect(
      isBlankMeaningHintConsistent({
        hint: "other",
        answer: "alphas",
        baseWord: "alpha",
        wordMeanings: ["abc"],
      }),
    ).toBe(false);
  });

  it("requires a valid owned meaning for AI blanks", () => {
    expect(
      resolveValidBlankMeaningHint({
        meanings: ["abc"],
        answer: "alphas",
        baseWord: "alpha",
      }),
    ).toBe("abc");

    expect(
      resolveValidBlankMeaningHint({
        meanings: ["  "],
        meaning: null,
        answer: "alphas",
        baseWord: "alpha",
      }),
    ).toBeNull();

    expect(wordHasBlankMeaningHint({ meanings: ["abc"] })).toBe(true);
    expect(wordHasBlankMeaningHint({ meanings: [], meaning: null })).toBe(false);
  });

  it("injects the meaning cue next to the blank once", () => {
    expect(withBlankMeaningHint("This is a ________ test.", "abc")).toBe(
      "This is a ________ (abc) test.",
    );
    expect(
      withBlankMeaningHint("This is a ________ (abc) test.", "abc"),
    ).toBe("This is a ________ (abc) test.");
  });
});
