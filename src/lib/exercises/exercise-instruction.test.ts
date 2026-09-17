import { describe, expect, it } from "vitest";
import {
  instructionGroundedInSource,
  isNeutralInstruction,
  isWriteSentenceTask,
  resolveImportInstruction,
} from "@/lib/exercises/exercise-instruction";

const source = `
Plural adjectives
Write a sentence where the adjective is in the plural form.
a. sweet:
b. beautiful:
`;

describe("exercise instruction fidelity", () => {
  it("keeps grounded source instructions", () => {
    const instruction =
      "Write a sentence where the adjective is in the plural form.";
    expect(instructionGroundedInSource(instruction, source)).toBe(true);
    expect(
      resolveImportInstruction({ instruction, sourceText: source }),
    ).toBe(instruction);
  });

  it("rejects invented grammar instructions", () => {
    const invented = "Write the adjective in the advanced dual instrumental case.";
    expect(instructionGroundedInSource(invented, source)).toBe(false);
    expect(
      resolveImportInstruction({ instruction: invented, sourceText: source }),
    ).toBeNull();
  });

  it("recognizes neutral fallbacks", () => {
    expect(isNeutralInstruction("Complete the exercise.")).toBe(true);
    expect(isNeutralInstruction("Fill in the blank.")).toBe(true);
  });

  it("detects write-a-sentence tasks", () => {
    expect(
      isWriteSentenceTask(
        "Write a sentence where the adjective is in the plural form.",
      ),
    ).toBe(true);
    expect(isWriteSentenceTask("Fill in the blank.")).toBe(false);
  });
});
