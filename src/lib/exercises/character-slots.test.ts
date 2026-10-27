import { describe, expect, it } from "vitest";
import {
  answerSlotLength,
  editableAnswerCharacters,
  formatSlotValue,
  isSlotAnswerComplete,
  maximumAnswerSlotLength,
  slotDisplayParts,
  templateForSlotValue,
} from "@/lib/exercises/character-slots";

describe("character slots", () => {
  it("counts Unicode letters as individual editable slots", () => {
    expect(answerSlotLength("hyötyä")).toBe(6);
    expect(editableAnswerCharacters("hyötyä")).toEqual([
      "h",
      "y",
      "ö",
      "t",
      "y",
      "ä",
    ]);
  });

  it("keeps spaces and punctuation in the template without making them inputs", () => {
    expect(answerSlotLength("New York!")) .toBe(7);
    expect(formatSlotValue("newyork", ["New York!"])).toBe("new york!");
    expect(
      slotDisplayParts("new york!", ["New York!"]).filter(
        (part) => !part.editable,
      ),
    ).toEqual([
      { editable: false, character: " ", entered: "" },
      { editable: false, character: "!", entered: "" },
    ]);
    expect(formatSlotValue("", ["New York!"])).toBe("");
  });

  it("clamps pasted input to the longest accepted answer", () => {
    expect(maximumAnswerSlotLength(["talo", "talossa"])).toBe(7);
    expect(formatSlotValue("talossakin", ["talo", "talossa"])).toBe(
      "talossa",
    );
  });

  it("supports accepted answers with different lengths", () => {
    const answers = ["color", "colour"];
    expect(templateForSlotValue("colo", answers)).toBe("color");
    expect(isSlotAnswerComplete("color", answers)).toBe(true);
    expect(templateForSlotValue("colou", answers)).toBe("color");
    expect(templateForSlotValue("colour", answers)).toBe("colour");
    expect(isSlotAnswerComplete("colour", answers)).toBe(true);
    expect(isSlotAnswerComplete("colo", answers)).toBe(false);
  });

  it("normalizes decomposed accented input", () => {
    expect(formatSlotValue("a\u0308iti", ["äiti"])).toBe("äiti");
  });

  it("treats IME-composed graphemes as one character without language rules", () => {
    const decomposedVietnamese = "suo\u0302\u0301i";
    expect(answerSlotLength(decomposedVietnamese)).toBe(4);
    expect(formatSlotValue(decomposedVietnamese, ["suối"])).toBe("suối");
  });
});
