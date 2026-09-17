import { describe, expect, it } from "vitest";
import {
  mergeTableRowsByLabel,
  notesFormatBlocksToDoc,
  sanitizeVocabularyNotesFormatBlocks,
} from "@/lib/vocabulary/format-notes-ai";
import {
  isNotesDocEmpty,
  vocabularyNotesToPlainText,
  serializeVocabularyNotes,
} from "@/lib/vocabulary/notes-content";

describe("sanitizeVocabularyNotesFormatBlocks", () => {
  it("drops invented paradigm titles and language headings", () => {
    const blocks = sanitizeVocabularyNotesFormatBlocks(
      [
        { type: "heading", level: 1, text: "Sample – Noun Paradigm" },
        { type: "heading", level: 2, text: "English" },
        { type: "heading", level: 2, text: "Sample" },
        {
          type: "table",
          headers: ["Category", "Form A", "Form B"],
          rows: [["Present", "walk", "walks"]],
          boldFirstColumn: true,
        },
        { type: "paragraph", text: "Keep this note" },
      ],
      "Sample",
    );

    expect(blocks).toEqual([
      {
        type: "table",
        headers: ["Category", "Form A", "Form B"],
        rows: [["Present", "walk", "walks"]],
        boldFirstColumn: true,
      },
      { type: "paragraph", text: "Keep this note" },
    ]);
  });

  it("merges same-label rows and joins cell variants with /", () => {
    const blocks = sanitizeVocabularyNotesFormatBlocks([
      {
        type: "table",
        headers: ["Category", "Form A", "Form B"],
        rows: [
          ["Genitive", "stem", "variantA"],
          ["Genitive", "stem", "variantB"],
          ["Partitive", "p1", "p2"],
        ],
        boldFirstColumn: true,
      },
    ]);

    expect(blocks).toEqual([
      {
        type: "table",
        headers: ["Category", "Form A", "Form B"],
        rows: [
          ["Genitive", "stem", "variantA/variantB"],
          ["Partitive", "p1", "p2"],
        ],
        boldFirstColumn: true,
      },
    ]);
  });
});

describe("mergeTableRowsByLabel", () => {
  it("dedupes identical variants case-insensitively", () => {
    expect(
      mergeTableRowsByLabel([
        ["Label", "A", "B"],
        ["label", "a", "C"],
      ]),
    ).toEqual([["Label", "A", "B/C"]]);
  });
});

describe("notesFormatBlocksToDoc", () => {
  it("builds a TipTap table with bold first column from AI table blocks", () => {
    const doc = notesFormatBlocksToDoc([
      {
        type: "table",
        headers: ["Category", "Form A", "Form B"],
        rows: [
          ["Present", "walk", "walks"],
          ["Past", "walked", "walked"],
        ],
        boldFirstColumn: true,
      },
    ]);

    expect(doc.type).toBe("doc");
    const table = doc.content?.[0];
    expect(table?.type).toBe("table");
    expect(table?.content).toHaveLength(3);

    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[1]?.type).toBe("paragraph");
    expect(doc.content?.[1]?.content).toBeUndefined();

    const headerRow = table?.content?.[0];
    expect(headerRow?.type).toBe("tableRow");
    expect(headerRow?.content?.[0]?.type).toBe("tableHeader");
    expect(headerRow?.content?.[0]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Category",
      marks: [{ type: "bold" }],
    });

    const firstBody = table?.content?.[1];
    expect(firstBody?.content?.[0]?.type).toBe("tableCell");
    expect(firstBody?.content?.[0]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Present",
      marks: [{ type: "bold" }],
    });
    expect(firstBody?.content?.[1]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "walk",
    });
    expect(
      firstBody?.content?.[1]?.content?.[0]?.content?.[0]?.marks,
    ).toBeUndefined();

    expect(isNotesDocEmpty(doc)).toBe(false);
    const plain = vocabularyNotesToPlainText(serializeVocabularyNotes(doc));
    expect(plain).toContain("Category | Form A | Form B");
    expect(plain).toContain("Present | walk | walks");
  });
});
