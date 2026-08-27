import { describe, expect, it } from "vitest";
import {
  instructionGroundedInSource,
  isNeutralInstruction,
  isWriteSentenceTask,
  resolveImportInstruction,
} from "@/lib/exercises/exercise-instruction";

const source = `
Monikon partitiivi – adjektiivit
Kirjoita lause, jossa adjektiivi on monikon partitiivissa.
a. makea:
b. kaunis:
`;

describe("exercise instruction fidelity", () => {
  it("keeps grounded source instructions", () => {
    const instruction =
      "Kirjoita lause, jossa adjektiivi on monikon partitiivissa.";
    expect(instructionGroundedInSource(instruction, source)).toBe(true);
    expect(
      resolveImportInstruction({ instruction, sourceText: source }),
    ).toBe(instruction);
  });

  it("rejects invented grammar instructions", () => {
    const invented = "Write the adjective in the Finnish plural partitive case.";
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
        "Kirjoita lause, jossa adjektiivi on monikon partitiivissa.",
      ),
    ).toBe(true);
    expect(isWriteSentenceTask("T-monikko")).toBe(false);
  });
});
