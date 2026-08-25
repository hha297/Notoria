/**
 * Tests use a tiny constructed language as sample user Theory content.
 * They must not encode production knowledge for any real target language.
 */
import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { analyzeTheory } from "@/lib/theory-exercises/analyze";
import { extractTheoryContent } from "@/lib/theory-exercises/extract";
import {
  formatPatternHint,
  generateSystemTheoryExercises,
  selectAppliedMaterials,
} from "@/lib/theory-exercises/generate-system";
import {
  applyBestChange,
  applyChange,
  buildDistractorsFromChanges,
  discoverChange,
  fillBlankAcceptableAnswers,
  isStructuredPair,
  isTransformationPair,
  looksLikeGlossPair,
  splitFillBlankParts,
} from "@/lib/theory-exercises/patterns";
import { buildTheoryExerciseSession } from "@/lib/theory-exercises/build-session";
import { mapAiDraftsToTheoryExercises } from "@/lib/theory-exercises/generate-ai";

/** Constructed “language” sample Theory document (user content fixture). */
const sampleDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Marking plurality" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "after many + countable → plural mark",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The plural mark is used after many when referring to countable things.",
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "alpha → alphas" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "beta → betas" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "gamma → gammas" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "delta → deltas" }],
            },
          ],
        },
      ],
    },
  ],
};

describe("theory analysis", () => {
  it("discovers transformations from Theory pairs", () => {
    const extracted = extractTheoryContent(sampleDoc);
    const analysis = analyzeTheory(extracted, "Marking plurality");
    expect(analysis.transformations.length).toBeGreaterThan(0);
    expect(analysis.changePool.length).toBeGreaterThan(0);
    expect(
      analysis.kind === "transformation" ||
        analysis.kind === "mixed" ||
        analysis.kind === "definition",
    ).toBe(true);
  });

  it("applies discovered patterns to Vocabulary material", () => {
    const extracted = extractTheoryContent(sampleDoc);
    const analysis = analyzeTheory(extracted, "Marking plurality");
    const changes = analysis.transformations
      .map((t) => t.change)
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const applied = applyBestChange("omega", changes);
    expect(applied).not.toBeNull();
    expect(applied!.form.toLowerCase()).not.toBe("omega");
  });

  it("applies append-only suffix changes", () => {
    const form = applyChange("alpha", { kind: "suffix", from: "", to: "s" });
    expect(form).toBe("alphas");
  });

  it("formats pattern hints from discovered changes", () => {
    expect(formatPatternHint(discoverChange("gamma", "gammas"))).toBe("… → -s");
    expect(formatPatternHint(discoverChange("rock", "rocks"))).toBe("… → -s");
  });

  it("splits fill-blank into visible base + tail answer", () => {
    expect(splitFillBlankParts("alpha", "alphas")).toEqual({
      prefix: "alpha",
      answer: "s",
    });
    expect(splitFillBlankParts("verb", "tail")).toEqual({
      prefix: "verb",
      answer: "tail",
      spaced: true,
    });
    // Context + complement: blank only the discovered feature ending
    expect(
      splitFillBlankParts("come", "shopped", ["ed", "ing", "s"]),
    ).toEqual({
      prefix: "come shopp",
      answer: "ed",
    });
    expect(
      fillBlankAcceptableAnswers("s", { prefix: "alpha" }),
    ).toContain("alphas");
  });
});

describe("theory system generator", () => {
  it("builds application exercises from Vocabulary + Theory", () => {
    const extracted = extractTheoryContent(sampleDoc);
    const vocabulary = [
      { id: "1", word: "omega" },
      { id: "2", word: "sigma" },
      { id: "3", word: "theta" },
    ];
    const materials = selectAppliedMaterials(
      analyzeTheory(extracted, "Marking plurality"),
      vocabulary,
      { max: 6 },
    );
    expect(materials.length).toBeGreaterThan(0);

    const items = generateSystemTheoryExercises("theory_1", extracted, {
      maxItems: 10,
      theoryTitle: "Marking plurality",
      vocabulary,
    });
    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      expect(item.source).toBe("theory");
      expect(item.materialSource).toBeDefined();
      if (item.type === "transformation") {
        expect(item.promptWord.length).toBeGreaterThan(0);
        expect(item.answer.toLowerCase()).not.toBe(item.promptWord.toLowerCase());
      }
      if (item.type === "fill_blank" && item.prefix) {
        expect(item.answer.length).toBeGreaterThan(0);
        expect(item.sentence).toContain(item.prefix);
      }
    }
  });

  it("builds distractors only from discovered change pool", () => {
    expect(isStructuredPair({ left: "alpha", right: "alphas" })).toBe(true);
    expect(isTransformationPair({ left: "alpha", right: "alphas" })).toBe(true);
    expect(looksLikeGlossPair("alpha beta", "some English gloss here")).toBe(true);

    const distractors = buildDistractorsFromChanges(
      "alpha",
      "alphas",
      [
        { kind: "suffix", from: "", to: "s" },
        { kind: "suffix", from: "", to: "ed" },
        { kind: "suffix", from: "", to: "ing" },
      ],
      3,
    );
    expect(distractors.length).toBeGreaterThanOrEqual(2);
    for (const d of distractors) {
      expect(d.toLowerCase().startsWith("alpha")).toBe(true);
    }
  });

  it("uses context questions for phrase relations, not form-of-phrase", () => {
    const usageDoc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "When to use -s / -ed / -ing" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "start walking" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "keep going" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const extracted = extractTheoryContent(usageDoc);
    const analysis = analyzeTheory(extracted, "When to use -s / -ed / -ing");
    expect(analysis.relations.length).toBeGreaterThan(0);
    expect(analysis.highlightedFeatures.length).toBeGreaterThan(0);

    const items = generateSystemTheoryExercises("theory_usage", extracted, {
      maxItems: 10,
      theoryTitle: "When to use -s / -ed / -ing",
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      if (item.type === "multiple_choice") {
        expect(item.prompt.toLowerCase()).toMatch(/after/);
      }
      if (item.type === "transformation") {
        expect(item.promptWord.split(" ").length).toBe(1);
      }
      if (item.type === "fill_blank" && item.prefix) {
        // With discovered features (-s/-ed/-ing), blank only the ending:
        // e.g. "start walk________" not "start ________"
        expect(item.answer.length).toBeGreaterThan(0);
        expect(item.spaced).not.toBe(true);
        expect(item.prefix.split(" ").length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("merges optional AI application items", () => {
    const aiItems = mapAiDraftsToTheoryExercises(
      "theory_1",
      [
        {
          type: "transformation",
          promptWord: "omega",
          answer: "omegas",
          materialSource: "vocabulary",
        },
      ],
      "Marking plurality",
    );
    const session = buildTheoryExerciseSession({
      theoryId: "theory_1",
      theoryTitle: "Marking plurality",
      doc: sampleDoc,
      vocabulary: [{ id: "1", word: "omega" }],
      aiItems,
      maxItems: 12,
    });
    expect(session.knowledgeKind).toBeTruthy();
    expect(session.items.some((i) => i.generator === "system")).toBe(true);
    expect(session.items.some((i) => i.generator === "ai")).toBe(true);
  });
});
