import { describe, expect, it } from "vitest";
import {
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
        { type: "heading", level: 1, text: "Rauhallinen – Noun Paradigm" },
        { type: "heading", level: 2, text: "Suomi" },
        { type: "heading", level: 2, text: "Rauhallinen" },
        {
          type: "table",
          headers: ["Sija", "Yksikkö", "Monikko"],
          rows: [["Genetiivi", "rauhallisen", "rauhallisten"]],
          boldFirstColumn: true,
        },
        { type: "paragraph", text: "Keep this note" },
      ],
      "Rauhallinen",
    );

    expect(blocks).toEqual([
      {
        type: "table",
        headers: ["Sija", "Yksikkö", "Monikko"],
        rows: [["Genetiivi", "rauhallisen", "rauhallisten"]],
        boldFirstColumn: true,
      },
      { type: "paragraph", text: "Keep this note" },
    ]);
  });
});

describe("notesFormatBlocksToDoc", () => {
  it("builds a TipTap table with bold first column like AI case paradigms", () => {
    const doc = notesFormatBlocksToDoc([
      {
        type: "table",
        headers: ["Sija", "Yksikkö", "Monikko"],
        rows: [
          ["Nominatiivi", "vuokra", "vuokrat"],
          ["Genetiivi", "vuokran", "vuokrien"],
        ],
        boldFirstColumn: true,
      },
    ]);

    expect(doc.type).toBe("doc");
    const table = doc.content?.[0];
    expect(table?.type).toBe("table");
    expect(table?.content).toHaveLength(3);

    // Trailing empty paragraph only when the doc ends with a table (caret slot).
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[1]?.type).toBe("paragraph");
    expect(doc.content?.[1]?.content).toBeUndefined();

    const headerRow = table?.content?.[0];
    expect(headerRow?.type).toBe("tableRow");
    expect(headerRow?.content?.[0]?.type).toBe("tableHeader");
    expect(headerRow?.content?.[0]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Sija",
      marks: [{ type: "bold" }],
    });

    const firstBody = table?.content?.[1];
    expect(firstBody?.content?.[0]?.type).toBe("tableCell");
    expect(firstBody?.content?.[0]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "Nominatiivi",
      marks: [{ type: "bold" }],
    });
    expect(firstBody?.content?.[1]?.content?.[0]?.content?.[0]).toMatchObject({
      type: "text",
      text: "vuokra",
    });
    expect(
      firstBody?.content?.[1]?.content?.[0]?.content?.[0]?.marks,
    ).toBeUndefined();

    expect(isNotesDocEmpty(doc)).toBe(false);
    const plain = vocabularyNotesToPlainText(serializeVocabularyNotes(doc));
    expect(plain).toContain("Sija | Yksikkö | Monikko");
    expect(plain).toContain("Nominatiivi | vuokra | vuokrat");
  });
});
