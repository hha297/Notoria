import { describe, expect, it } from "vitest";
import {
  answersMatchAny,
  forceFullWordBlank,
  isValidTheoryExercise,
  mapAiDraftsToTheoryExercises,
  resolveFullWordAnswer,
  revealTextForExercise,
} from "@/lib/theory-exercises/generate-ai";
import { buildTheoryExerciseSession } from "@/lib/theory-exercises/build-session";

describe("AI theory exercise mapping", () => {
  it("maps fill_blank drafts with accepted answers and hints", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "fill_blank",
          learningObjective: "Complete the required noun form.",
          targetType: "full_word",
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
    expect(item.spaced).toBe(true);
    expect(item.hint).toBeTruthy();
    expect(answersMatchAny("Project", item.acceptedAnswers)).toBe(true);
  });

  it("converts in-word blanks into full-word blanks with source word", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "suffix",
        sentence: "I found an article top________.",
        answer: "topicform",
        sourceWord: "topic",
        completedSentence: "I found an article topicform.",
        hint: "Change the base word into the form required by the sentence.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.spaced).toBe(true);
    expect(item.sentence).toBe("I found an article ________.");
    expect(item.prefix?.endsWith("top")).toBe(false);
    expect(item.sourceWord).toBe("topic");
    expect(item.answer).toBe("topicform");
    expect(revealTextForExercise(item)).toBe("topic → topicform");
  });

  it("recovers full-word answers when AI returns only an ending", () => {
    expect(
      resolveFullWordAnswer({
        answer: "sta",
        sourceWord: "aihe",
        completedSentence: "Löysin artikkelin aiheesta.",
      }),
    ).toBe("aiheesta");

    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "suffix",
        sentence: "Löysin artikkelin aihee________.",
        answer: "sta",
        sourceWord: "aihe",
        completedSentence: "Löysin artikkelin aiheesta.",
        hint: "Change aihe into the form required by the sentence.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.sentence).toBe("Löysin artikkelin ________.");
    expect(item.answer).toBe("aiheesta");
    expect(item.sourceWord).toBe("aihe");
  });

  it("forceFullWordBlank detaches glued stems", () => {
    expect(forceFullWordBlank("Löysin artikkelin aihee________.")).toBe(
      "Löysin artikkelin ________.",
    );
  });

  it("normalizes underscore runs into a single blank", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Complete the required verb form.",
        targetType: "full_word",
        sentence: "Students _______ about the topic.",
        answer: "spoke",
        hint: "Use the verb form required by the Theory.",
        completedSentence: "Students spoke about the topic.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.sentence).toBe("Students ________ about the topic.");
    expect(item.prefix).toBe("Students");
    expect(item.suffix).toBe("about the topic.");
    expect(item.spaced).toBe(true);
  });

  it("requires a distinct sourceWord for word-form fills", () => {
    const missing = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the plural partitive.",
        targetType: "word_form",
        sentence: "We have ________.",
        answer: "dogs",
        hint: "Use the required plural form.",
        completedSentence: "We have dogs.",
      },
    ]);
    expect(missing).toHaveLength(0);

    const sameAsAnswer = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the plural partitive.",
        targetType: "word_form",
        sentence: "We have ________.",
        answer: "dogs",
        sourceWord: "dogs",
        hint: "Use the required plural form.",
        completedSentence: "We have dogs.",
      },
    ]);
    expect(sameAsAnswer).toHaveLength(0);

    const ok = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the plural partitive.",
        targetType: "word_form",
        sentence: "We have ________.",
        answer: "dogs",
        sourceWord: "dog",
        hint: "Use the required plural form.",
        completedSentence: "We have dogs.",
      },
    ]);
    expect(ok).toHaveLength(1);
    const item = ok[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.sourceWord).toBe("dog");
  });

  it("rejects English sentence frames when studying a non-English language", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "fill_blank",
          learningObjective: "Practice the required form.",
          targetType: "word_form",
          sentence: "I heard ________ the news yesterday.",
          answer: "uutisista",
          sourceWord: "uutinen",
          hint: "Use the form required by the Theory.",
          completedSentence: "I heard uutisista the news yesterday.",
        },
      ],
      "Verb + Rektio",
      30,
      "Finnish",
    );
    expect(items).toHaveLength(0);
  });

  it("strips duplicate answer tokens before or after the blank", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "I am interested in historyform ________ (history).",
        answer: "historyform",
        sourceWord: "history",
        completedSentence: "I am interested in historyform historyform.",
        hint: "Change the base word into the form required by the sentence.",
      },
    ]);
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.prefix?.toLowerCase()).not.toContain("historyform");
    expect(item.suffix?.toLowerCase() ?? "").not.toContain("historyform");
    expect(item.sentence.toLowerCase().split("historyform").length - 1).toBe(0);
  });

  it("moves answer leaks and glosses out of the sentence into the hint", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "full_word",
        sentence: "I look for info ________ bookform. (about)",
        answer: "bookform",
        hint: "Use the form required after this verb.",
      },
    ]);
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.suffix ?? "").not.toMatch(/bookform/i);
    expect(item.sentence).not.toMatch(/\(about\)/i);
    expect(item.hint.toLowerCase()).toContain("about");
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
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "They spoke about the trip________.",
        answer: "tripform",
        sourceWord: "trip",
        hint: "Change the base word into the required form.",
        completedSentence: "They spoke about the tripform.",
      },
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "She wrote about the project________.",
        answer: "projectform",
        sourceWord: "project",
        hint: "Change the base word into the required form.",
        completedSentence: "She wrote about the projectform.",
      },
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "She wrote about the project________.",
        answer: "projectform",
        sourceWord: "project",
        hint: "Change the base word into the required form.",
        completedSentence: "She wrote about the projectform.",
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
        spaced: true,
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
  });
});
