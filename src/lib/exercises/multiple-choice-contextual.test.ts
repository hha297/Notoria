import { describe, expect, it } from "vitest";
import {
  contextualExerciseToQuestion,
  fillContextualBlank,
} from "@/lib/exercises/multiple-choice";

describe("fillContextualBlank", () => {
  it("inserts the grammatical answer form at the blank", () => {
    expect(
      fillContextualBlank("Mistä tulee ________ keittiössä?", "hanasta"),
    ).toBe("Mistä tulee hanasta keittiössä?");
  });

  it("lowercases mid-sentence fills even if the form arrives capitalized", () => {
    expect(
      fillContextualBlank("Mistä tulee ________ keittiössä?", "Hanasta"),
    ).toBe("Mistä tulee hanasta keittiössä?");
  });

  it("capitalizes when the blank starts the sentence", () => {
    expect(fillContextualBlank("________ on keittiössä.", "hana")).toBe(
      "Hana on keittiössä.",
    );
  });
});

describe("contextualExerciseToQuestion", () => {
  it("keeps base option and stores answerForm for reveal", () => {
    const question = contextualExerciseToQuestion(
      {
        wordId: "w1",
        prompt: "Mistä tulee ________ keittiössä?",
        options: ["Hana", "Viemäri", "Roska", "Porras"],
        correctOption: "Hana",
        baseWord: "Hana",
        answerForm: "hanasta",
        sentenceMeaning: "Where does the water come from in the kitchen?",
      },
      0,
    );

    expect(question).not.toBeNull();
    expect(question!.correctOption).toBe("Hana");
    expect(question!.answerForm).toBe("hanasta");
    expect(question!.baseWord).toBe("Hana");
    expect(question!.options).toHaveLength(4);
    expect(fillContextualBlank(question!.prompt, question!.answerForm!)).toBe(
      "Mistä tulee hanasta keittiössä?",
    );
  });

  it("rejects questions without exactly 4 options", () => {
    expect(
      contextualExerciseToQuestion(
        {
          wordId: "w1",
          prompt: "Missä on ________?",
          options: ["Hana", "Viemäri", "Roska"],
          correctOption: "Hana",
        },
        0,
      ),
    ).toBeNull();
  });
});
