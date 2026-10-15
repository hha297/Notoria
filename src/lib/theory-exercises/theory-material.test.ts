import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  enforceExampleReuseLimit,
  extractExampleLexemes,
  extractTheoryGenerationMaterial,
  isExampleDerivedExercise,
  maxExampleReuseAllowed,
  targetExampleReuseCount,
} from "@/lib/theory-exercises/theory-material";

function doc(content: JSONContent["content"]): JSONContent {
  return { type: "doc", content };
}

describe("theory generation material", () => {
  it("splits rules from list/blockquote examples without rewriting notes", () => {
    const material = extractTheoryGenerationMaterial(
      doc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Plural forms" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Use the required ending when the noun is plural.",
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
          ],
        },
      ]),
    );

    expect(material.rulesText.toLowerCase()).toContain("required ending");
    expect(material.exampleTexts.some((t) => /alpha/i.test(t))).toBe(true);
    expect(material.exampleLexemes).toEqual(
      expect.arrayContaining(["alpha", "alphas", "beta", "betas"]),
    );
    expect(material.exampleLexemes).not.toContain("use");
  });

  it("computes reuse caps with floor(finalCount × ratio)", () => {
    expect(maxExampleReuseAllowed(10)).toBe(2);
    expect(maxExampleReuseAllowed(4)).toBe(0);
    expect(maxExampleReuseAllowed(5)).toBe(1);
    expect(targetExampleReuseCount(10)).toBe(1);
    expect(maxExampleReuseAllowed(0)).toBe(0);
  });

  it("counts base-word reuse even when the sentence changes", () => {
    expect(
      isExampleDerivedExercise(
        {
          type: "fill_blank",
          sourceWord: "alpha",
          answer: "alphas",
        },
        ["alpha"],
      ),
    ).toBe(true);

    expect(
      isExampleDerivedExercise(
        {
          type: "fill_blank",
          sourceWord: "gamma",
          answer: "gammas",
        },
        ["alpha"],
      ),
    ).toBe(false);
  });

  it("does not treat short shared prefixes as example reuse", () => {
    // Would false-positive under 3-char prefix matching and collapse sets to ~20%.
    expect(
      isExampleDerivedExercise(
        {
          type: "fill_blank",
          sourceWord: "gamma",
          answer: "gammassa",
        },
        ["game", "garden", "galaxy"],
      ),
    ).toBe(false);

    expect(
      isExampleDerivedExercise(
        {
          type: "fill_blank",
          sourceWord: "talo",
          answer: "talossa",
        },
        ["talo"],
      ),
    ).toBe(true);
  });

  it("does not treat tiny function words as example lexemes", () => {
    expect(extractExampleLexemes(["the and or to of alpha"])).toEqual(["alpha"]);
  });

  it("enforces the reuse limit on merged final sets", () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      type: "fill_blank",
      sourceWord: index < 7 ? "alpha" : `fresh${index}`,
      answer: index < 7 ? "alphas" : `fresh${index}s`,
    }));

    const limited = enforceExampleReuseLimit(items, ["alpha"], 10);
    const reused = limited.filter((item) => item.sourceWord === "alpha");
    expect(reused).toHaveLength(2);
    expect(limited.length).toBeLessThanOrEqual(10);
  });

  it("allows zero reused examples for small final sets", () => {
    const items = [
      { type: "fill_blank", sourceWord: "alpha", answer: "alphas" },
      { type: "fill_blank", sourceWord: "beta", answer: "betas" },
      { type: "fill_blank", sourceWord: "gamma", answer: "gammas" },
    ];
    const limited = enforceExampleReuseLimit(items, ["alpha", "beta"], 3);
    // floor(3 * 0.2) = 0
    expect(limited.every((item) => item.sourceWord === "gamma")).toBe(true);
  });

  it("keeps fresh items even when reused items appear first in a large pool", () => {
    const items = [
      ...Array.from({ length: 20 }, () => ({
        type: "fill_blank",
        sourceWord: "alpha",
        answer: "alphas",
      })),
      ...Array.from({ length: 15 }, (_, index) => ({
        type: "fill_blank",
        sourceWord: `fresh${index}`,
        answer: `fresh${index}s`,
      })),
    ];
    const limited = enforceExampleReuseLimit(items, ["alpha"], 15);
    expect(limited).toHaveLength(15);
    expect(limited.every((item) => item.sourceWord.startsWith("fresh"))).toBe(
      true,
    );
  });
});

