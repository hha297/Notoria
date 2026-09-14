import { describe, expect, it } from "vitest";
import { noteBlocksToPlainText, notesToBlocks } from "@/lib/vocabulary/export/note-blocks";

describe("notesToBlocks", () => {
  it("keeps TipTap headings, marks, lists, and tables", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Usage" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "A " },
            { type: "text", text: "gap year", marks: [{ type: "bold" }] },
            { type: "text", text: "." },
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
                  content: [{ type: "text", text: "compound" }],
                },
              ],
            },
          ],
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Sija" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Yksikkö" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Nominatiivi" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "talo" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const blocks = notesToBlocks(JSON.stringify(doc));
    expect(blocks.map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "table",
    ]);
    expect(blocks[1]).toMatchObject({
      type: "paragraph",
      runs: [
        { text: "A " },
        { text: "gap year", bold: true },
        { text: "." },
      ],
    });
    expect(noteBlocksToPlainText(blocks)).toContain("Sija | Yksikkö");
  });

  it("skips empty paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph" },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
        { type: "paragraph" },
      ],
    };
    expect(notesToBlocks(JSON.stringify(doc))).toEqual([
      { type: "paragraph", runs: [{ text: "Hello" }] },
    ]);
  });

  it("still presents flattened pipe tables from plain notes", () => {
    const blocks = notesToBlocks(
      ["Sija | Yksikkö | Monikko", "Nominatiivi | talo | talot"].join("\n"),
    );
    expect(blocks[0]).toMatchObject({
      type: "table",
      rows: [
        [[{ text: "Sija" }], [{ text: "Yksikkö" }], [{ text: "Monikko" }]],
        [[{ text: "Nominatiivi" }], [{ text: "talo" }], [{ text: "talot" }]],
      ],
    });
  });
});
