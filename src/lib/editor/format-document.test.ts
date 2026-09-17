import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  formatTiptapDocument,
  hierarchicalHeadingDepth,
} from "@/lib/editor/format-document";

function textDoc(...blocks: JSONContent[]): JSONContent {
  return { type: "doc", content: blocks };
}

function paragraph(text: string, marks?: JSONContent["marks"]): JSONContent {
  return {
    type: "paragraph",
    content: text
      ? [{ type: "text", text, ...(marks ? { marks } : {}) }]
      : undefined,
  };
}

function heading(level: number, text: string): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

describe("hierarchicalHeadingDepth", () => {
  it("maps numbering depth to heading levels", () => {
    expect(hierarchicalHeadingDepth("1. Introduction")).toBe(1);
    expect(hierarchicalHeadingDepth("1.1 Basic concepts")).toBe(2);
    expect(hierarchicalHeadingDepth("1.1.1 Examples")).toBe(3);
    expect(hierarchicalHeadingDepth("1.3.10 Special cases")).toBe(3);
    expect(hierarchicalHeadingDepth("2. Conclusion")).toBe(1);
    expect(hierarchicalHeadingDepth("10.2 Advanced")).toBe(2);
    expect(hierarchicalHeadingDepth("10.2.3 Nested")).toBe(3);
  });

  it("accepts trailing section dots (2.1. / 2.1.1.)", () => {
    expect(hierarchicalHeadingDepth("2. Generic heading")).toBe(1);
    expect(hierarchicalHeadingDepth("2.1. Nested heading")).toBe(2);
    expect(hierarchicalHeadingDepth("2.1.1. Deeper heading")).toBe(3);
  });
});

describe("formatTiptapDocument", () => {
  it("collapses excess blank paragraphs", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        heading(1, "Heading"),
        paragraph(""),
        paragraph(""),
        paragraph("This is a paragraph."),
        paragraph(""),
        paragraph(""),
        paragraph(""),
      ),
    );

    expect(formatted.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
    ]);
  });

  it("promotes mixed bullet markers into one bullet list", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("- First item"),
        paragraph("• Second item"),
        paragraph(". Third item"),
      ),
    );

    expect(formatted.content).toHaveLength(1);
    expect(formatted.content?.[0]?.type).toBe("bulletList");
    expect(formatted.content?.[0]?.content).toHaveLength(3);
    expect(
      formatted.content?.[0]?.content?.map(
        (item) => item.content?.[0]?.content?.[0]?.text,
      ),
    ).toEqual(["First item", "Second item", "Third item"]);
  });

  it("normalizes hierarchical headings including 1.3.10 → H3", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("1. Introduction"),
        paragraph("1.1 Basic concepts"),
        paragraph("1.1.1 Examples"),
        paragraph("1.2 Advanced concepts"),
        paragraph("1.3.10 Special cases"),
        paragraph("2. Conclusion"),
      ),
    );

    const levels = formatted.content?.map((node) => ({
      type: node.type,
      level: node.attrs?.level,
      text: node.content?.[0]?.text,
    }));

    expect(levels).toEqual([
      { type: "heading", level: 1, text: "1. Introduction" },
      { type: "heading", level: 2, text: "1.1 Basic concepts" },
      { type: "heading", level: 3, text: "1.1.1 Examples" },
      { type: "heading", level: 2, text: "1.2 Advanced concepts" },
      { type: "heading", level: 3, text: "1.3.10 Special cases" },
      { type: "heading", level: 1, text: "2. Conclusion" },
    ]);
  });

  it("corrects wrong heading levels from numbering", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        heading(1, "1. Grammar"),
        heading(1, "1.1 Nouns"),
        heading(1, "1.1.1 Singular"),
        heading(1, "1.2 Verbs"),
      ),
    );

    expect(formatted.content?.map((node) => node.attrs?.level)).toEqual([
      1, 2, 3, 2,
    ]);
  });

  it("fixes numbered headings with a trailing section dot that were stuck as H1", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        heading(1, "2. Generic heading"),
        heading(1, "2.1. Nested heading"),
        heading(1, "2.1.1. Deeper heading"),
      ),
    );

    expect(formatted.content?.map((node) => node.attrs?.level)).toEqual([
      1, 2, 3,
    ]);
  });

  it("converts clear unmarked short lines into a bullet list", () => {
    const formatted = formatTiptapDocument(
      textDoc(paragraph("Apple"), paragraph("Banana"), paragraph("Orange")),
    );

    expect(formatted.content?.[0]?.type).toBe("bulletList");
    expect(formatted.content?.[0]?.content).toHaveLength(3);
  });

  it("does not turn normal paragraphs into lists", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("This is a full sentence about grammar."),
        paragraph("Another complete thought follows here."),
      ),
    );

    expect(formatted.content?.every((node) => node.type === "paragraph")).toBe(
      true,
    );
  });

  it("preserves bold marks inside list items", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        {
          type: "paragraph",
          content: [
            { type: "text", text: "- " },
            { type: "text", text: "Important", marks: [{ type: "bold" }] },
            { type: "text", text: " item" },
          ],
        },
        paragraph("- Second"),
      ),
    );

    const firstItemText = formatted.content?.[0]?.content?.[0]?.content?.[0];
    expect(formatted.content?.[0]?.type).toBe("bulletList");
    expect(firstItemText?.content?.[0]).toMatchObject({
      type: "text",
      text: "Important",
      marks: [{ type: "bold" }],
    });
  });

  it("is idempotent for hierarchical outlines", () => {
    const once = formatTiptapDocument(
      textDoc(
        paragraph("1. Introduction"),
        paragraph("1.1 Basics"),
        paragraph("1.1.1 Detail"),
      ),
    );
    const twice = formatTiptapDocument(once);
    expect(twice).toEqual(once);
  });

  it("keeps **markdown** bold", () => {
    const formatted = formatTiptapDocument(textDoc(paragraph("**important**")));
    expect(formatted.content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "important", marks: [{ type: "bold" }] }],
    });
  });

  it("converts a pipe table without turning prose into a table", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("Word | Comparative | English"),
        paragraph("wide | wider | broad"),
        paragraph("tall | taller | high"),
      ),
    );
    expect(formatted.content?.[0]?.type).toBe("table");
    expect(formatted.content?.[0]?.content).toHaveLength(3);

    const prose = formatTiptapDocument(
      textDoc(
        paragraph("This is a normal sentence about grammar."),
        paragraph("Another complete thought follows here."),
      ),
    );
    expect(prose.content?.every((node) => node.type === "paragraph")).toBe(
      true,
    );
  });

  it("nests indented bullet lines", () => {
    const formatted = formatTiptapDocument(
      textDoc(paragraph("- parent"), paragraph("  - child")),
    );
    expect(formatted.content?.[0]?.type).toBe("bulletList");
    expect(
      formatted.content?.[0]?.content?.[0]?.content?.some(
        (node) => node.type === "bulletList",
      ),
    ).toBe(true);
  });

  it("bolds obvious Term: labels without rewriting the rest", () => {
    const formatted = formatTiptapDocument(
      textDoc(paragraph("Term: example")),
    );
    expect(formatted.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Term:",
      marks: [{ type: "bold" }],
    });
  });

  it("treats sequential 1. 2. 3. lines as an ordered list, not H1s", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("1. apples"),
        paragraph("2. bananas"),
        paragraph("3. oranges"),
      ),
    );
    expect(formatted.content?.[0]?.type).toBe("orderedList");
    expect(formatted.content?.[0]?.content).toHaveLength(3);
  });

  it("structures a dictionary dump without inventing paradigm tables", () => {
    const source = `
- widget in english
- Nouns
- gadget
- device
- Definitions
- Noun

a short generic definition

Inflection
Present walk walks
Past walked walked
Future will-walk will-walk
`.trim();

    const formatted = formatTiptapDocument(
      textDoc(
        ...source
          .split("\n")
          .map((line) => paragraph(line.trim() ? line.trim() : "")),
      ),
    );
    const types = formatted.content?.map((node) => node.type);
    expect(types?.[0]).toBe("heading");
    expect(formatted.content?.[0]?.attrs?.level).toBe(1);
    expect(formatted.content?.[0]?.content?.[0]?.text).toBe("widget in english");
    expect(types).toContain("bulletList");
    expect(
      formatted.content?.some(
        (node) =>
          node.type === "heading" && node.content?.[0]?.text === "Definitions",
      ),
    ).toBe(true);
    // Deterministic Format does not invent labeled paradigm tables.
    expect(types).not.toContain("table");
  });

  it("does not invent tables from unlabeled prose lines", () => {
    const formatted = formatTiptapDocument(
      textDoc(
        paragraph("Category alpha form-a form-b"),
        paragraph("Category beta form-c form-d"),
        paragraph("Category gamma form-e form-f"),
        paragraph("Category delta form-g form-h"),
      ),
    );
    expect(formatted.content?.some((node) => node.type === "table")).toBe(
      false,
    );
  });
});
