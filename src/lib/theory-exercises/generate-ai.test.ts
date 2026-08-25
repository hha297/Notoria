import { describe, expect, it } from "vitest";
import {
  answersMatchAny,
  isValidTheoryExercise,
  mapAiDraftsToTheoryExercises,
  revealTextForExercise,
} from "@/lib/theory-exercises/generate-ai";
import { buildTheoryExerciseSession } from "@/lib/theory-exercises/build-session";

const targetFields = {
  learningObjective: "Practice the required ending after this verb pattern.",
  targetType: "suffix" as const,
  hint: "Add the ending required by the Theory for this construction.",
};

describe("AI theory exercise mapping", () => {
  it("maps fill_blank drafts with accepted answers and hints", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "fill_blank",
          learningObjective: "Complete the required noun form.",
          targetType: "word_form",
          sentence: "We talked about the new ________",
          answer: "project",
          acceptedAnswers: ["project", "Project"],
          hint: "Use the form required by the sentence.",
          explanation: "The Theory requires this construction after the verb.",
          materialSource: "ai",
          completedSentence: "We talked about the new project",
        },
      ],
      "Sample Theory",
    );

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.generator).toBe("ai");
    expect(item.sentence).toContain("________");
    expect(item.hint).toBeTruthy();
    expect(item.learningObjective).toBeTruthy();
    expect(answersMatchAny("Project", item.acceptedAnswers)).toBe(true);
  });

  it("maps suffix fills glued to the stem and reveals the full sentence", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        ...targetFields,
        sentence: "She wrote about the weekendtrip________.",
        answer: "about",
        acceptedAnswers: ["about", "-about"],
        sourceWord: "weekendtrip",
        completedSentence: "She wrote about the weekendtripabout.",
        hint: "Complete the ending required after this verb when expressing a topic.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.spaced).toBe(false);
    expect(item.prefix?.endsWith("weekendtrip")).toBe(true);
    expect(item.answer).toBe("about");
    expect(answersMatchAny("-about", item.acceptedAnswers)).toBe(true);
    expect(revealTextForExercise(item)).toBe("She wrote about the weekendtripabout.");
  });

  it("rejects suffix targets that blank a separate whole word", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        ...targetFields,
        sentence: "She ________ about the weekendtripabout.",
        answer: "wrote",
        sourceWord: "weekendtrip",
        hint: "This verb means to express something in writing.",
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("maps transformation drafts with an explicit source word", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "transformation",
        learningObjective: "Form the required plural.",
        targetType: "word_form",
        promptWord: "alpha",
        answer: "alphas",
        acceptedAnswers: ["alphas"],
        hint: "Apply the plural mark from the Theory.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("transformation");
    if (item.type !== "transformation") return;
    expect(item.promptWord).toBe("alpha");
    expect(item.answer).toBe("alphas");
    expect(revealTextForExercise(item)).toContain("alpha → alphas");
  });

  it("rejects abstract label multiple-choice drafts", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "multiple_choice",
        learningObjective: "Choose the correct pattern label.",
        targetType: "concept",
        prompt: "After the verb, which pattern is correct?",
        options: ["-sta/-stä", "MISTÄ?", "jostakin"],
        correctOption: "-sta/-stä",
        hint: "Pick the label from the Theory table.",
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("keeps distinct sentences that share the same answer", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required ending.",
        targetType: "suffix",
        sentence: "They spoke about the trip________.",
        answer: "form",
        sourceWord: "trip",
        hint: "Add the ending required by the Theory.",
      },
      {
        type: "fill_blank",
        learningObjective: "Practice the required ending.",
        targetType: "suffix",
        sentence: "She wrote about the project________.",
        answer: "form",
        sourceWord: "project",
        hint: "Add the ending required by the Theory.",
      },
      {
        type: "fill_blank",
        learningObjective: "Practice the required ending.",
        targetType: "suffix",
        sentence: "She wrote about the project________.",
        answer: "form",
        sourceWord: "project",
        hint: "Add the ending required by the Theory.",
      },
      {
        type: "transformation",
        learningObjective: "Form the plural.",
        targetType: "word_form",
        promptWord: "book",
        answer: "books",
        hint: "Add the plural ending from the Theory.",
      },
    ]);
    // Two unique suffix contexts + one transformation; clone sentence dropped
    expect(items.length).toBe(3);
  });

  it("starts practice sessions empty for AI generation", () => {
    const session = buildTheoryExerciseSession({
      theoryId: "t1",
      theoryTitle: "Notes",
    });
    expect(session.items).toEqual([]);
  });

  it("requires learning objective, target type, and hint", () => {
    expect(
      isValidTheoryExercise({
        id: "x",
        source: "theory",
        theoryId: "t",
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource: "ai",
        sentence: "Hello ________",
        answer: "world",
        acceptedAnswers: ["world"],
        learningObjective: "Produce the missing word.",
        targetType: "full_word",
        hint: "Use the word required by the Theory.",
      }),
    ).toBe(true);

    expect(
      isValidTheoryExercise({
        id: "x",
        source: "theory",
        theoryId: "t",
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource: "ai",
        sentence: "Hello ________",
        answer: "world",
        acceptedAnswers: ["world"],
      }),
    ).toBe(false);

    expect(
      isValidTheoryExercise({
        id: "x",
        source: "theory",
        theoryId: "t",
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource: "ai",
        sentence: "Hello world",
        answer: "world",
        acceptedAnswers: ["world"],
        learningObjective: "Produce the missing word.",
        targetType: "full_word",
        hint: "Use the word required by the Theory.",
      }),
    ).toBe(false);
  });
});
