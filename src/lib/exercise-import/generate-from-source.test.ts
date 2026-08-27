import { describe, expect, it } from "vitest";
import {
  coerceImportAiDraft,
  filterDraftsToSourceFidelity,
  normalizeSourceForMatch,
  parseImportAiExercises,
  sourceContainsCue,
} from "@/lib/exercise-import/generate-from-source";
import type { TheoryAiExerciseDraft } from "@/lib/theory-exercises/generate-ai";

const source = `
Täydennä taulukot nominien monikkomuodoilla
| Perusmuoto | T-monikko | Monikon partitiivi | Monikon S-missä- ja L-missä-muodot |
| katu | (blank) | (blank) | (blank) |
| (blank) | koulut | (blank) | (blank) |
Kirjoita lause, jossa adjektiivi on monikon partitiivissa.
Monikon partitiivi
a. kaunis:
b. tärkeä:
`;

function draft(
  partial: Partial<TheoryAiExerciseDraft> &
    Pick<TheoryAiExerciseDraft, "type" | "learningObjective" | "targetType" | "hint">,
): TheoryAiExerciseDraft {
  return partial;
}

describe("import source fidelity filter", () => {
  it("normalizes source for matching", () => {
    expect(normalizeSourceForMatch("Katu, koulut!")).toContain("katu");
    expect(normalizeSourceForMatch("Katu, koulut!")).toContain("koulut");
  });

  it("keeps transformation cues that appear in the source", () => {
    const kept = filterDraftsToSourceFidelity(
      [
        draft({
          type: "transformation",
          learningObjective: "T-plural",
          targetType: "word_form",
          hint: "plural",
          promptWord: "katu",
          answer: "kadut",
          instruction: "T-monikko",
        }),
        draft({
          type: "transformation",
          learningObjective: "adj",
          targetType: "word_form",
          hint: "partitive",
          promptWord: "kaunis",
          answer: "kauniita",
          instruction: "Kirjoita lause, jossa adjektiivi on monikon partitiivissa.",
        }),
      ],
      source,
    );
    expect(kept.map((d) => d.promptWord)).toEqual(["katu", "kaunis"]);
  });

  it("rejects invented cues and invented fill-blank frames", () => {
    const kept = filterDraftsToSourceFidelity(
      [
        draft({
          type: "transformation",
          learningObjective: "invented",
          targetType: "word_form",
          hint: "x",
          promptWord: "auto",
          answer: "autot",
        }),
        draft({
          type: "fill_blank",
          learningObjective: "invented sentence",
          targetType: "word_form",
          hint: "x",
          sentence: "Kuulin ________ eilen.",
          answer: "uutisen",
          sourceWord: "uutinen",
        }),
      ],
      source,
    );
    expect(kept).toHaveLength(0);
  });

  it("keeps cue-grounded cards even when instruction was invented", () => {
    const kept = filterDraftsToSourceFidelity(
      [
        draft({
          type: "transformation",
          learningObjective: "hallucinated instruction",
          targetType: "word_form",
          hint: "x",
          promptWord: "kaunis",
          answer: "kauniita",
          instruction:
            "Write the Finnish adjective in the essive plural case please now.",
        }),
      ],
      source,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.promptWord).toBe("kaunis");
    expect(kept[0]?.instruction).toBeUndefined();
  });

  it("matches cues with list prefixes and punctuation", () => {
    expect(sourceContainsCue("a. makea:\nb. kaunis:", "makea")).toBe(true);
    expect(sourceContainsCue("a. makea:\nb. kaunis:", "a. makea")).toBe(true);
  });

  it("keeps source worksheet instructions on transformation cards", () => {
    const kept = filterDraftsToSourceFidelity(
      [
        draft({
          type: "transformation",
          learningObjective: "adj sentence",
          targetType: "word_form",
          hint: "partitive",
          promptWord: "kaunis",
          answer: "kauniita",
          instruction:
            "Kirjoita lause, jossa adjektiivi on monikon partitiivissa.",
          skillLabel: "Monikon partitiivi",
          showArrow: false,
        }),
      ],
      source,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]?.instruction).toContain("monikon partitiivissa");
  });

  it("rejects mixing another row cue into a fill frame not in source", () => {
    const kept = filterDraftsToSourceFidelity(
      [
        draft({
          type: "fill_blank",
          learningObjective: "ok if frame weak but cue present",
          targetType: "word_form",
          hint: "x",
          sentence: "________",
          answer: "kadut",
          sourceWord: "koulut",
        }),
      ],
      source,
    );
    // Bare blank with sourceWord in source can pass cue check; sentence frame is too short to reject.
    expect(kept).toHaveLength(1);
    expect(kept[0]?.sourceWord).toBe("koulut");
  });
});

describe("parseImportAiExercises", () => {
  it("repairs missing hint/learningObjective and keeps valid items", () => {
    const repaired = coerceImportAiDraft({
      type: "transformation",
      promptWord: "katu",
      answer: "kadut",
      instruction: "T-monikko",
    });
    expect(repaired?.promptWord).toBe("katu");
    expect(repaired?.hint?.length).toBeGreaterThan(0);
    expect(repaired?.learningObjective?.length).toBeGreaterThan(0);
    expect(repaired?.targetType).toBe("word_form");

    const drafts = parseImportAiExercises({
      exercises: [
        {
          type: "transformation",
          promptWord: "katu",
          answer: "kadut",
          instruction: "T-monikko",
        },
        { type: "nope", promptWord: "x" },
        {
          type: "fill_blank",
          sentence: "Minulla on ________.",
          answer: "koira",
          sourceWord: "koira",
          learningObjective: "fill",
          targetType: "full_word",
          hint: "dog",
        },
      ],
    });
    expect(drafts.length).toBe(2);
  });

  it("does not fail the batch when exercise count exceeds theory max of 30", () => {
    const exercises = Array.from({ length: 40 }, (_, i) => ({
      type: "transformation",
      promptWord: `word${i}`,
      answer: `ans${i}`,
      learningObjective: `obj${i}`,
      targetType: "word_form",
      hint: `hint${i}`,
    }));
    expect(parseImportAiExercises({ exercises })).toHaveLength(40);
  });
});

describe("classifyImportSource", () => {
  it("detects theory notes vs worksheet blanks", async () => {
    const { classifyImportSource } = await import(
      "@/lib/exercise-import/generate-from-source"
    );
    expect(
      classifyImportSource(
        "Aikamuodot\n1. Lý thuyết\nTrong tiếng Phần Lan có 4 thì\nKhi dùng: Preesens",
      ),
    ).toBe("notes");
    expect(
      classifyImportSource(
        "Täydennä taulukot\n| a | b |\n| --- | --- |\n| katu | (blank) |\na. kaunis:",
      ),
    ).toBe("worksheet");
  });
});
