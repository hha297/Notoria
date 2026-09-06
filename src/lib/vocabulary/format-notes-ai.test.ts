import { describe, expect, it } from "vitest";
import { notesFormatBlocksToDoc } from "@/lib/vocabulary/format-notes-ai";
import {
  isNotesDocEmpty,
  vocabularyNotesToPlainText,
  serializeVocabularyNotes,
} from "@/lib/vocabulary/notes-content";

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
    expect(firstBody?.content?.[1]?.content?.[0]?.content?.[0]?.marks).toBeUndefined();

    expect(isNotesDocEmpty(doc)).toBe(false);
    const plain = vocabularyNotesToPlainText(serializeVocabularyNotes(doc));
    expect(plain).toContain("Sija | Yksikkö | Monikko");
    expect(plain).toContain("Nominatiivi | vuokra | vuokrat");
  });
});
