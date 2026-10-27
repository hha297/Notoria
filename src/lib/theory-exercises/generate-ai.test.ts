import { describe, expect, it } from "vitest";
import {
  answersMatchAny,
  extractSourceWordCueFromHint,
  filterPersistedTheoryExercises,
  forceFullWordBlank,
  isVagueExplanation,
  isValidTheoryExercise,
  mapAiDraftsToTheoryExercises,
  resolveFullWordAnswer,
  revealTextForExercise,
} from "@/lib/theory-exercises/generate-ai";
import { buildTheoryExerciseSession } from "@/lib/theory-exercises/build-session";
import {
  exercisePassesSemanticResult,
  THEORY_EXERCISE_SEMANTIC_PROMPT,
} from "@/lib/theory-exercises/semantic-validate";

describe("AI theory exercise mapping", () => {
  it("keeps only the selected question type", () => {
    const drafts = [
      {
        type: "multiple_choice" as const,
        learningObjective: "Choose the form required by the rule",
        targetType: "concept" as const,
        prompt: "Which form follows the rule?",
        options: ["one", "two", "three", "four"],
        correctOption: "three",
        hint: "Apply the rule before choosing.",
      },
      {
        type: "fill_blank" as const,
        learningObjective: "Complete the form required by the rule",
        targetType: "concept" as const,
        sentence: "This is ________ today.",
        completedSentence: "This is ready today.",
        answer: "ready",
        hint: "Apply the rule to the missing word.",
      },
    ];

    const multipleChoice = mapAiDraftsToTheoryExercises(
      "theory_1",
      drafts,
      "Rule",
      10,
      { questionType: "multiple_choice" },
    );
    expect(multipleChoice).toHaveLength(1);
    expect(multipleChoice[0]?.type).toBe("multiple_choice");

    const fillBlank = mapAiDraftsToTheoryExercises(
      "theory_1",
      drafts,
      "Rule",
      10,
      { questionType: "fill_blank" },
    );
    expect(fillBlank.every((item) => item.type === "fill_blank")).toBe(true);
  });

  it("requires exactly four distinct multiple-choice options", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "multiple_choice",
          learningObjective: "Choose the correct form",
          targetType: "concept",
          prompt: "Which option is correct?",
          options: ["same", "same", "other", "last"],
          correctOption: "same",
          hint: "Use the theory rule.",
        },
      ],
      "Rule",
      10,
      { questionType: "multiple_choice" },
    );

    expect(items).toEqual([]);
  });

  it("uses a cloze sentence as the multiple-choice prompt", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "multiple_choice",
          learningObjective: "Choose the form required by the rule",
          targetType: "full_word",
          sentence: "Lapset leikkivät ________.",
          options: ["puisto", "puistot", "puistossa", "puistoissa"],
          correctOption: "puistoissa",
          hint: "Use the plural form required by the sentence.",
        },
      ],
      "Plural rule",
      10,
      { questionType: "multiple_choice" },
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "multiple_choice",
      prompt: "Lapset leikkivät ________.",
      correctOption: "puistoissa",
    });
  });
  it("rejects an English multiple-choice card for a Finnish workspace", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "multiple_choice",
          learningObjective: "Choose the correct noun form for this sentence.",
          targetType: "full_word",
          prompt: "Which word belongs in the blank?",
          instruction: "Choose the correct answer.",
          options: ["house", "street", "school", "garden"],
          correctOption: "house",
          hint: "Read the sentence and choose the best answer.",
        },
      ],
      "Nominien taivutus",
      10,
      { questionType: "multiple_choice", studyLanguage: "fi" },
    );

    expect(items).toEqual([]);
  });

  it("keeps a Finnish multiple-choice card for a Finnish workspace", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "multiple_choice",
          learningObjective: "Valitse lauseeseen sopiva muoto.",
          targetType: "full_word",
          prompt: "Huomenna menen ________ opiskelemaan.",
          instruction: "Valitse oikea vaihtoehto.",
          options: ["kouluun", "koulussa", "koulusta", "koululla"],
          correctOption: "kouluun",
          hint: "Liike kohti paikkaa vaatii tulosijan.",
        },
      ],
      "Paikallissijat",
      10,
      { questionType: "multiple_choice", studyLanguage: "fi" },
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "multiple_choice",
      correctOption: "kouluun",
    });
  });

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

  it("maps fill_blank sentenceMeaning for post-answer UI gloss", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Form the VA-participle.",
        targetType: "word_form",
        sentence: "Saatan nähdä ________ junan.",
        answer: "tulevan",
        acceptedAnswers: ["tulevan"],
        sourceWord: "tulla",
        hint: "Active present participle.",
        materialSource: "ai",
        completedSentence: "Saatan nähdä tulevan junan.",
        sentenceMeaning: "I might see the coming train.",
      },
    ]);

    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.sentenceMeaning).toBe("I might see the coming train.");
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
    expect(item.hint?.toLowerCase()).toContain("about");
  });

  it("keeps base-word cues next to the blank instead of burying them in the hint", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the comparative.",
        targetType: "word_form",
        sentence: "Tämä talo on ________ (suuri).",
        answer: "suurempi",
        hint: "Muista lisätä -mpi.",
      },
      {
        type: "fill_blank",
        learningObjective: "Practice the comparative.",
        targetType: "word_form",
        sentence: "Tämä kaupunki on ________.",
        answer: "isompi",
        sourceWord: "iso",
        hint: "Muista lisätä -mpi. (iso)",
      },
    ]);

    expect(items).toHaveLength(2);

    const fromSentence = items[0]!;
    expect(fromSentence.type).toBe("fill_blank");
    if (fromSentence.type !== "fill_blank") return;
    expect(fromSentence.sourceWord).toBe("suuri");
    expect(fromSentence.sentence).not.toMatch(/\(suuri\)/i);
    expect(fromSentence.hint?.toLowerCase() ?? "").not.toContain("suuri");
    expect(fromSentence.hint).toContain("-mpi");

    const fromSource = items[1]!;
    expect(fromSource.type).toBe("fill_blank");
    if (fromSource.type !== "fill_blank") return;
    expect(fromSource.sourceWord).toBe("iso");
    expect(fromSource.hint?.toLowerCase() ?? "").not.toMatch(/\(iso\)/);
  });

  it("extracts a base-word cue already stuck in the hint for display", () => {
    const recovered = extractSourceWordCueFromHint(
      "Muista lisätä -mpi. (suuri)",
    );
    expect(recovered.cue).toBe("suuri");
    expect(recovered.hint.toLowerCase()).not.toContain("suuri");
    expect(recovered.hint).toContain("-mpi");
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

  it("rejects when the target form is already visible and the blank asks for something unrelated", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required plural form.",
        targetType: "word_form",
        sentence: "The alphas were near the ________ yesterday.",
        answer: "river",
        sourceWord: "alpha",
        completedSentence: "The alphas were near the river yesterday.",
        hint: "Use the place noun required by the frame.",
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("rejects form practice with no source cue / insufficient pre-answer information", () => {
    const noCue = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "________.",
        answer: "alphas",
        completedSentence: "alphas.",
        hint: "Inflect the word.",
      },
    ]);
    expect(noCue).toHaveLength(0);

    const thin = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "________.",
        answer: "alphas",
        sourceWord: "alpha",
        completedSentence: "alphas.",
        hint: "Inflect the word.",
      },
    ]);
    expect(thin).toHaveLength(0);
  });

  it("keeps blank answer, completed sentence, and grading on the same surface form", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "They chose the ________ carefully.",
        answer: "alphas",
        sourceWord: "alpha",
        // Divergent reveal must not win over the graded blank answer.
        completedSentence: "They chose the alphas carefully.",
        acceptedAnswers: ["alphas", "Alphas"],
        hint: "Use the required plural form.",
      },
    ]);
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.type).toBe("fill_blank");
    if (item.type !== "fill_blank") return;
    expect(item.answer).toBe("alphas");
    expect(item.completedSentence).toBe("They chose the alphas carefully.");
    expect(answersMatchAny("Alphas", item.acceptedAnswers)).toBe(true);
    expect(answersMatchAny("alpha", item.acceptedAnswers)).toBe(false);
    expect(revealTextForExercise(item)).toContain("alpha → alphas");
    expect(item.sentence.replace("________", item.answer)).toBe(
      item.completedSentence,
    );
  });

  it("accepts legitimate casing variants without accepting the lemma", () => {
    expect(answersMatchAny("Alphas", ["alphas"])).toBe(true);
    expect(answersMatchAny("alpha", ["alphas"])).toBe(false);
  });

  it("enforces example reuse limits across the final mapped set", () => {
    const exampleLexemes = ["alpha", "beta"];
    const drafts = Array.from({ length: 10 }, (_, index) => ({
      type: "fill_blank" as const,
      learningObjective: "Practice the required form.",
      targetType: "word_form" as const,
      sentence:
        index < 6
          ? `People discussed the ________ today in room ${index}.`
          : `Writers mentioned the ________ today in room ${index}.`,
      answer: index < 6 ? "alphas" : `gamma${index}`,
      sourceWord: index < 6 ? "alpha" : `gamma${index}`,
      completedSentence:
        index < 6
          ? `People discussed the alphas today in room ${index}.`
          : `Writers mentioned the gamma${index} today in room ${index}.`,
      hint: "Use the required form of the cue.",
      materialSource: index < 6 ? ("theory" as const) : ("ai" as const),
    }));

    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      drafts,
      "Sample",
      10,
      { exampleLexemes },
    );

    // floor(10 * 0.2) = 2 example-derived items max.
    const reused = items.filter(
      (item) =>
        item.type === "fill_blank" &&
        (item.sourceWord === "alpha" || item.answer === "alphas"),
    );
    expect(reused.length).toBeLessThanOrEqual(2);
    expect(items.length).toBeGreaterThan(0);
  });

  it("allows zero example reuse when theory has no examples", () => {
    const items = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "fill_blank",
          learningObjective: "Practice the required form.",
          targetType: "word_form",
          sentence: "Learners practised the ________ carefully today.",
          answer: "alphas",
          sourceWord: "alpha",
          completedSentence: "Learners practised the alphas carefully today.",
          hint: "Use the required plural form.",
        },
      ],
      "Sample",
      10,
      { exampleLexemes: [] },
    );
    expect(items).toHaveLength(1);
  });

  it("rejects explanations that only restate the topic without grounding the answer", () => {
    expect(
      isVagueExplanation({
        explanation: "Formation of the required grammatical case.",
        learningObjective: "Formation of the required grammatical case.",
        skillLabel: "Case forms",
        sourceWord: "alpha",
        answer: "alphas",
      }),
    ).toBe(true);

    expect(
      isVagueExplanation({
        explanation: "Change alpha to alphas for the required plural role.",
        learningObjective: "Practice the required plural form.",
        sourceWord: "alpha",
        answer: "alphas",
      }),
    ).toBe(false);
  });

  it("rejects drafts whose explanation mismatches the cue→answer task", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required case form.",
        targetType: "word_form",
        sentence: "People admired the ________ near the lake today.",
        answer: "alphas",
        sourceWord: "alpha",
        completedSentence: "People admired the alphas near the lake today.",
        hint: "Use the required form of the cue.",
        explanation: "Practice the required case form.",
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("rejects when a related inflected form of the cue is already visible outside the blank", () => {
    const items = mapAiDraftsToTheoryExercises("theory_1", [
      {
        type: "fill_blank",
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        sentence: "The alphas stood beside the ________ yesterday.",
        answer: "river",
        sourceWord: "alpha",
        completedSentence: "The alphas stood beside the river yesterday.",
        hint: "Write the place noun.",
        explanation: "Change alpha into river for this frame.",
      },
    ]);
    expect(items).toHaveLength(0);
  });

  it("filters persisted exercises that fail structural validation", () => {
    const kept = filterPersistedTheoryExercises([
      {
        id: "ok",
        source: "theory",
        theoryId: "t",
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource: "ai",
        sentence: "Learners practised the ________ carefully today.",
        answer: "alphas",
        acceptedAnswers: ["alphas"],
        sourceWord: "alpha",
        prefix: "Learners practised the",
        suffix: "carefully today.",
        completedSentence: "Learners practised the alphas carefully today.",
        learningObjective: "Practice the required plural form.",
        instruction: "Write the required plural form.",
        targetType: "word_form",
        hint: "Use the cue in the required plural form.",
        explanation: "Change alpha to alphas in this plural slot.",
        spaced: true,
      },
      {
        id: "bad",
        source: "theory",
        theoryId: "t",
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource: "ai",
        sentence: "________.",
        answer: "alphas",
        acceptedAnswers: ["alphas"],
        learningObjective: "Practice the required form.",
        targetType: "word_form",
        hint: "Guess.",
        spaced: true,
      },
    ]);
    expect(kept.map((item) => item.id)).toEqual(["ok"]);
  });

  it("keeps the semantic validator prompt free of hardcoded learning samples", () => {
    expect(THEORY_EXERCISE_SEMANTIC_PROMPT).toContain("Form-category match");
    expect(THEORY_EXERCISE_SEMANTIC_PROMPT).toContain("formMatchesTheory");
    expect(THEORY_EXERCISE_SEMANTIC_PROMPT).toContain("answerCategory");
    expect(THEORY_EXERCISE_SEMANTIC_PROMPT).not.toMatch(
      /\bvaate|naisten|koira|uutinen|keskustelu|missa|mihin\b/i,
    );
    expect(THEORY_EXERCISE_SEMANTIC_PROMPT).not.toContain("few-shot");
  });

  it("drops form-category mismatches even when accept is true", () => {
    expect(exercisePassesSemanticResult(undefined)).toBe(true);
    expect(
      exercisePassesSemanticResult({
        accept: true,
        formMatchesTheory: false,
      }),
    ).toBe(false);
    expect(
      exercisePassesSemanticResult({
        accept: false,
        formMatchesTheory: true,
      }),
    ).toBe(false);
    expect(
      exercisePassesSemanticResult({
        accept: true,
        formMatchesTheory: true,
      }),
    ).toBe(true);
  });
});
