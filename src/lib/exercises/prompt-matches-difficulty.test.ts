import { describe, expect, it } from "vitest";
import { promptMatchesDifficulty } from "@/lib/exercises/prompt-matches-difficulty";

describe("promptMatchesDifficulty", () => {
  it("accepts short Easy prompts even with a long blank target later", () => {
    expect(promptMatchesDifficulty("Voit avata ________ keittiössä.", "easy")).toBe(
      true,
    );
    expect(promptMatchesDifficulty("Missä on ________?", "easy")).toBe(true);
  });

  it("rejects Easy prompts that are multi-clause or too long", () => {
    expect(
      promptMatchesDifficulty(
        "The apartment has a beautiful ________ which goes all the way to the second floor.",
        "easy",
      ),
    ).toBe(false);
    expect(
      promptMatchesDifficulty(
        "In summer we use the ________, so the garden stays neat.",
        "easy",
      ),
    ).toBe(false);
  });

  it("does not reject Easy just because surrounding tokens are moderately long", () => {
    // Target vocabulary length is irrelevant; only sentence shape matters.
    expect(
      promptMatchesDifficulty("Näen ________ keittiössä.", "easy"),
    ).toBe(true);
  });

  it("allows Hard to use longer multi-clause prompts", () => {
    expect(
      promptMatchesDifficulty(
        "The apartment has a beautiful ________ which goes to the second floor.",
        "hard",
      ),
    ).toBe(true);
  });

  it("allows Medium a single clause break but not extreme length", () => {
    expect(
      promptMatchesDifficulty("He bought a ________, because the old one broke.", "medium"),
    ).toBe(true);
    expect(
      promptMatchesDifficulty(
        "He bought a brand new ________ after thinking carefully for many days about the budget and the options.",
        "medium",
      ),
    ).toBe(false);
  });
});
