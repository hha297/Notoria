import { describe, expect, it } from "vitest";
import {
  acceptedAdditionalInstructions,
  additionalInstructionFields,
  appendAdditionalInstructions,
  normalizeAdditionalInstructions,
} from "@/lib/exercises/additional-instructions";

const BASE = "Base prompt. Do not replace this.";

describe("additional exercise instructions", () => {
  it("leaves the base prompt unchanged when instructions are empty", () => {
    expect(appendAdditionalInstructions(BASE, "  ")).toBe(BASE);
    expect(appendAdditionalInstructions(BASE, null)).toBe(BASE);
    expect(additionalInstructionFields("")).toEqual({});
  });

  it("appends instructions after the base prompt without replacing it", () => {
    const next = appendAdditionalInstructions(BASE, "Prefer short dialogues.");
    expect(next.startsWith(BASE)).toBe(true);
    expect(next).toContain("Prefer short dialogues.");
    expect(next).toContain("Lower priority");
    expect(additionalInstructionFields("Prefer short dialogues.")).toMatchObject({
      additionalInstructions: "Prefer short dialogues.",
    });
  });

  it("trims and caps instructions", () => {
    expect(normalizeAdditionalInstructions("  hello  ")).toBe("hello");
    expect(normalizeAdditionalInstructions("x".repeat(2500))?.length).toBe(2000);
  });

  it("rejects non-empty instructions for Free and Pro and allows Premium", () => {
    expect(acceptedAdditionalInstructions("free", "Be concise")).toEqual({
      ok: false,
      code: "PREMIUM_REQUIRED",
    });
    expect(acceptedAdditionalInstructions("pro", "Be concise").ok).toBe(false);
    expect(acceptedAdditionalInstructions("premium", "Be concise")).toEqual({
      ok: true,
      text: "Be concise",
    });
    expect(acceptedAdditionalInstructions("free", "  ")).toEqual({
      ok: true,
      text: null,
    });
  });
});
