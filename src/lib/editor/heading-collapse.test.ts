import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import {
  computeHiddenBlockIndices,
  getSectionEndIndex,
  headingHasSectionContent,
} from "@/lib/editor/heading-collapse";

function heading(level: number, text: string): JSONContent {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function paragraph(text: string): JSONContent {
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : undefined,
  };
}

describe("heading section boundaries", () => {
  const blocks: JSONContent[] = [
    heading(1, "A"),
    paragraph("a1"),
    heading(2, "B"),
    paragraph("b1"),
    heading(3, "C"),
    paragraph("c1"),
    heading(3, "D"),
    paragraph("d1"),
    heading(2, "E"),
    paragraph("e1"),
    heading(1, "F"),
    paragraph("f1"),
  ];

  it("H1 A owns everything until the next H1", () => {
    expect(getSectionEndIndex(blocks, 0)).toBe(10);
  });

  it("H2 B owns through nested H3s until H2 E", () => {
    expect(getSectionEndIndex(blocks, 2)).toBe(8);
  });

  it("H3 C ends at H3 D", () => {
    expect(getSectionEndIndex(blocks, 4)).toBe(6);
  });

  it("H2 E ends at H1 F", () => {
    expect(getSectionEndIndex(blocks, 8)).toBe(10);
  });

  it("heading with no following content has empty section", () => {
    const lonely = [heading(2, "Only"), heading(2, "Next")];
    expect(headingHasSectionContent(lonely, 0)).toBe(false);
    expect(getSectionEndIndex(lonely, 0)).toBe(1);
  });

  it("handles H1 → H3 without H2", () => {
    const skipped = [
      heading(1, "Top"),
      paragraph("p"),
      heading(3, "Deep"),
      paragraph("d"),
      heading(1, "Next"),
    ];
    expect(getSectionEndIndex(skipped, 0)).toBe(4);
    expect(getSectionEndIndex(skipped, 2)).toBe(4);
  });

  it("hides only section interiors for collapsed headings", () => {
    const hidden = computeHiddenBlockIndices(blocks, new Set([2, 4]));
    // H2 B collapsed → hides indices 3..7
    // H3 C collapsed → hides 5 (already in range)
    expect(hidden.has(3)).toBe(true);
    expect(hidden.has(4)).toBe(true); // nested heading still "in" parent section
    expect(hidden.has(5)).toBe(true);
    expect(hidden.has(8)).toBe(false); // H2 E visible when only B/C collapsed... wait
    // If only 2 and 4 collapsed: section of 2 is 3..8 exclusive end 8, so 3,4,5,6,7
    expect(hidden.has(7)).toBe(true);
    expect(hidden.has(8)).toBe(false);
    expect(hidden.has(2)).toBe(false); // heading itself never hidden by its own collapse
  });

  it("keeps next same-level heading visible when parent collapsed", () => {
    const hidden = computeHiddenBlockIndices(blocks, new Set([0]));
    expect(hidden.has(1)).toBe(true);
    expect(hidden.has(9)).toBe(true);
    expect(hidden.has(10)).toBe(false); // H1 F
    expect(hidden.has(0)).toBe(false);
  });
});
