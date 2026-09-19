import { describe, expect, it } from "vitest";
import {
  buildTheoryLessonBeats,
  groupTheoryLessonBeats,
  selectTheoryQuickReview,
  splitExampleLayers,
  theoryHasQuickReview,
  theoryLessonHasMaterial,
} from "@/lib/theory-exercises/lesson-content";

describe("theory lesson content", () => {
  it("keeps prose as the idea and lists as examples", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Use the partitive for incomplete objects." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Minä ostan " },
                    { type: "text", text: "kahvia", marks: [{ type: "bold" }] },
                    { type: "text", text: "." },
                  ],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "I am buying coffee." }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Minä juon vettä." }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(beats.map((beat) => beat.kind)).toEqual(["idea", "examples"]);
    expect(beats[1]?.examples).toHaveLength(2);
    expect(theoryLessonHasMaterial({ beats })).toBe(true);
  });

  it("uses existing headings as section titles without inventing copy", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "When to use it" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "After verbs of eating and drinking." }],
        },
      ],
    });

    expect(beats).toHaveLength(1);
    expect(beats[0]?.title).toBe("When to use it");
    expect(beats[0]?.kind).toBe("idea");
  });

  it("splits hard-break lines inside a paragraph into example lines", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Use a before a consonant sound." },
            { type: "hardBreak" },
            { type: "text", text: "Examples" },
            { type: "hardBreak" },
            { type: "text", text: "I need a book." },
            { type: "hardBreak" },
            { type: "text", text: "She ate an apple." },
          ],
        },
      ],
    });
    expect(beats.map((beat) => beat.kind)).toEqual(["idea", "examples"]);
    expect(beats[1]?.examples).toHaveLength(2);
  });

  it("does not over-split consecutive same-kind beats", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First idea." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Still the same idea." }],
        },
      ],
    });
    const sections = groupTheoryLessonBeats(beats);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.kind).toBe("idea");
  });

  it("treats a label paragraph plus short lines as examples", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Use a before a consonant sound and an before a vowel sound.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Examples" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "I need a book." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "She ate an apple." }],
        },
      ],
    });

    expect(beats.map((beat) => beat.kind)).toEqual(["idea", "examples"]);
    expect(beats[1]?.title).toBe("Examples");
    expect(beats[1]?.examples).toHaveLength(2);
  });

  it("splits a list item into sentence and existing extra note", () => {
    const { primary, note } = splitExampleLayers({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Minä ostan kahvia." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "I am buying coffee." }],
        },
      ],
    });
    expect(primary.content).toHaveLength(1);
    expect(note?.content).toHaveLength(1);
  });

  it("builds a quick review from the idea and existing examples only", () => {
    const beats = buildTheoryLessonBeats({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Use the partitive for incomplete objects." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Minä ostan kahvia." }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Minä juon vettä." }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Hän lukee kirjaa." }],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Exceptions" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "A later detail the quick path can skip." }],
        },
      ],
    });
    const sections = groupTheoryLessonBeats(beats);
    const quick = selectTheoryQuickReview(sections);
    expect(theoryHasQuickReview(sections)).toBe(true);
    expect(quick.map((section) => section.kind)).toEqual(["idea", "examples"]);
    expect(quick.some((section) => section.title === "Exceptions")).toBe(false);
    expect(quick.find((section) => section.kind === "examples")?.examples.length).toBe(3);
  });
});
