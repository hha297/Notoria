import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  coerceHeadingLevel,
  headingTagForLevel,
  normalizeTipTapHeadingLevels,
} from "@/lib/editor/heading-level";
import { tipTapDocumentToHtml } from "@/lib/editor/render-document";
import { formatTiptapDocument } from "@/lib/editor/format-document";
import {
  parseTheoryContent,
  serializeTheoryContent,
} from "@/lib/theory/content";

function heading(level: number | string, text: string): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

describe("coerceHeadingLevel", () => {
  it("keeps numeric levels and coerces strings", () => {
    expect(coerceHeadingLevel(1)).toBe(1);
    expect(coerceHeadingLevel(2)).toBe(2);
    expect(coerceHeadingLevel(3)).toBe(3);
    expect(coerceHeadingLevel("2")).toBe(2);
    expect(coerceHeadingLevel("3")).toBe(3);
    expect(coerceHeadingLevel(null)).toBe(1);
    expect(coerceHeadingLevel(undefined)).toBe(1);
  });
});

describe("tipTapDocumentToHtml Preview renderer", () => {
  it("emits semantic h1/h2/h3 from attrs.level", () => {
    const html = tipTapDocumentToHtml({
      type: "doc",
      content: [
        heading(1, "1. Main topic"),
        heading(2, "1.1 Subtopic"),
        heading(3, "1.1.1 Sub-subtopic"),
        heading(2, "1.2 Another subtopic"),
        heading(3, "1.3.10 Deep section"),
        heading(1, "2. Another main topic"),
        heading(2, "2.1 Subtopic"),
      ],
    });

    expect(html).toContain("<h1>1. Main topic</h1>");
    expect(html).toContain("<h2>1.1 Subtopic</h2>");
    expect(html).toContain("<h3>1.1.1 Sub-subtopic</h3>");
    expect(html).toContain("<h2>1.2 Another subtopic</h2>");
    expect(html).toContain("<h3>1.3.10 Deep section</h3>");
    expect(html).toContain("<h1>2. Another main topic</h1>");
    expect(html).toContain("<h2>2.1 Subtopic</h2>");
    expect(html.match(/<h1>/g)?.length).toBe(2);
    expect(html.match(/<h2>/g)?.length).toBe(3);
    expect(html.match(/<h3>/g)?.length).toBe(2);
  });

  it("does not render every heading as h1 when level is a string", () => {
    const html = tipTapDocumentToHtml({
      type: "doc",
      content: [
        heading("1", "2. Using the Superlative"),
        heading("2", "2.1. Not All Adjectives Have a Superlative"),
        heading("3", "2.1.1. Example"),
      ],
    });

    expect(html).toContain("<h1>2. Using the Superlative</h1>");
    expect(html).toContain(
      "<h2>2.1. Not All Adjectives Have a Superlative</h2>",
    );
    expect(html).toContain("<h3>2.1.1. Example</h3>");
  });

  it("Format → Save → Load → Preview keeps heading tags", () => {
    const formatted = formatTiptapDocument({
      type: "doc",
      content: [
        heading(1, "1. Main topic"),
        heading(1, "1.1 Subtopic"),
        heading(1, "1.1.1 Sub-subtopic"),
        heading(1, "1.2 Another subtopic"),
        heading(1, "1.3.10 Deep section"),
        heading(1, "2. Another main topic"),
        heading(1, "2.1 Subtopic"),
      ],
    });

    const saved = serializeTheoryContent({
      kind: "theory",
      version: 1,
      category: "grammar",
      description: "",
      doc: formatted,
    });
    const loaded = parseTheoryContent(saved);
    const html = tipTapDocumentToHtml(loaded.doc);

    expect(html).toContain("<h1>1. Main topic</h1>");
    expect(html).toContain("<h2>1.1 Subtopic</h2>");
    expect(html).toContain("<h3>1.1.1 Sub-subtopic</h3>");
    expect(html).toContain("<h2>1.2 Another subtopic</h2>");
    expect(html).toContain("<h3>1.3.10 Deep section</h3>");
    expect(html).toContain("<h1>2. Another main topic</h1>");
    expect(html).toContain("<h2>2.1 Subtopic</h2>");
  });
});

describe("normalizeTipTapHeadingLevels", () => {
  it("writes numeric levels onto heading attrs", () => {
    const normalized = normalizeTipTapHeadingLevels({
      type: "doc",
      content: [heading("2", "2.1 Title")],
    });
    expect(normalized.content?.[0]?.attrs?.level).toBe(2);
    expect(headingTagForLevel(normalized.content?.[0]?.attrs?.level)).toBe(
      "h2",
    );
  });
});
