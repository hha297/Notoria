import { describe, expect, it } from "vitest";
import { parseNotesForPresentation } from "@/lib/vocabulary/export/notes-presentation";

describe("parseNotesForPresentation", () => {
  it("renders pipe-separated paradigm dumps as a table, not a paragraph", () => {
    const blocks = parseNotesForPresentation(
      [
        "Category | Form A | Form B",
        "Present | walk | walks",
        "Past | walked | walked",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      {
        type: "table",
        rows: [
          ["Category", "Form A", "Form B"],
          ["Present", "walk", "walks"],
          ["Past", "walked", "walked"],
        ],
      },
    ]);
  });

  it("keeps headings, lists, and paragraphs in source order", () => {
    expect(
      parseNotesForPresentation(
        "# Cases\n\n- one\n- two\n\nSee also.\n\n1. first\n2. second",
      ),
    ).toEqual([
      { type: "heading", level: 1, text: "Cases" },
      { type: "bullet", items: ["one", "two"] },
      { type: "paragraph", text: "See also." },
      { type: "ordered", items: ["first", "second"] },
    ]);
  });

  it("drops extra blank lines", () => {
    expect(parseNotesForPresentation("Hello\n\n\nWorld")).toEqual([
      { type: "paragraph", text: "Hello" },
      { type: "paragraph", text: "World" },
    ]);
  });

  it("skips markdown divider rows and leading/trailing pipes", () => {
    const blocks = parseNotesForPresentation(
      ["| Word | Meaning |", "| --- | --- |", "| kissa | cat |"].join("\n"),
    );
    expect(blocks).toEqual([
      {
        type: "table",
        rows: [
          ["Word", "Meaning"],
          ["kissa", "cat"],
        ],
      },
    ]);
  });

  it("keeps mixed rich notes in source order", () => {
    const blocks = parseNotesForPresentation(
      [
        "## Usage",
        "Short note.",
        "",
        "Category | Form A | Form B",
        "Present | walk | walks",
        "",
        "- compound",
        "- loan",
        "",
        "```",
        "talo",
        "```",
      ].join("\n"),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "table",
      "bullet",
      "code",
    ]);
    expect(blocks[0]).toEqual({
      type: "heading",
      level: 2,
      text: "Usage",
    });
  });
});
