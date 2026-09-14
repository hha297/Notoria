import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { buildVocabularyExportDocument } from "@/lib/vocabulary/export/build-document";
import { generateVocabularyDocxBlob } from "@/lib/vocabulary/export/docx";
import { generateVocabularyPdfBlob } from "@/lib/vocabulary/export/pdf";
import { DEFAULT_VOCABULARY_EXPORT_OPTIONS } from "@/lib/vocabulary/export/types";
import type { VocabularyExportLabels } from "@/lib/vocabulary/export/types";

const labels: VocabularyExportLabels = {
  documentHeading: "Vocabulary",
  workspaceLabel: "Workspace",
  notesHeading: "Notes",
  wordCount: "4 words",
  uncategorizedPos: "Uncategorized",
  formatWordCount: (count) => `${count} words`,
  columns: {
    word: "Word",
    partOfSpeech: "Part of speech",
    meanings: "Meanings",
    tags: "Tags",
    notes: "Notes",
    updated: "Last updated",
  },
};

const tableNotes = JSON.stringify({
  type: "doc",
  content: [
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
                  content: [{ type: "text", text: "välivuosi" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const mixedNotes = [
  "## Usage",
  "Used for buildings people live in.",
  "",
  "- compound: kerrostalo",
  "1. first meaning",
].join("\n");

describe("vocabulary export document rendering", () => {
  it("builds a PDF and DOCX for short, table, and mixed notes", async () => {
    const options = {
      ...DEFAULT_VOCABULARY_EXPORT_OPTIONS,
      format: "pdf" as const,
    };
    const document = await buildVocabularyExportDocument(
      "Oma Kirja",
      [
        {
          word: "kissa",
          partOfSpeechLabel: "Noun",
          meanings: ["cat"],
          tagLabels: ["A1"],
          notes: "Short entry.",
          updatedAtLabel: "2026-09-14",
        },
        {
          word: "Välivuosi",
          partOfSpeechLabel: "Noun",
          meanings: ["Year off", "Gap year"],
          tagLabels: ["A2"],
          notes: tableNotes,
          updatedAtLabel: "2026-09-14",
        },
        {
          word: "talo",
          partOfSpeechLabel: "Noun",
          meanings: ["house"],
          tagLabels: ["A1"],
          notes: mixedNotes,
          updatedAtLabel: "2026-09-14",
        },
        {
          word: "oppia",
          partOfSpeechLabel: "Verb",
          meanings: ["to learn"],
          tagLabels: ["A2"],
          notes: "",
          updatedAtLabel: "2026-09-08",
        },
      ],
      options,
    );

    const pdfBlob = await generateVocabularyPdfBlob(document, labels, options);
    const docxBlob = await generateVocabularyDocxBlob(document, labels, {
      ...options,
      format: "docx",
    });

    expect(pdfBlob.size).toBeGreaterThan(1000);
    expect(docxBlob.size).toBeGreaterThan(1000);

    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    const proxy = await getDocumentProxy(pdfBytes);
    const { text } = await extractText(proxy, { mergePages: true });
    const body = Array.isArray(text) ? text.join("\n") : text;

    expect(body).toContain("NOUN");
    expect(body).toContain("VERB");
    expect(body).toContain("3 words");
    expect(body).toContain("kissa");
    expect(body).toContain("Välivuosi");
    expect(body).toContain("oppia");
    expect(body).toContain("to learn");
    expect(body).toContain("A2");
    expect(body.indexOf("kissa")).toBeLessThan(body.indexOf("talo"));
    expect(body.indexOf("talo")).toBeLessThan(body.indexOf("Välivuosi"));
    expect(body.indexOf("NOUN")).toBeLessThan(body.indexOf("kissa"));
    expect(body.indexOf("VERB")).toBeLessThan(body.indexOf("oppia"));
    expect(body).toContain("Nominatiivi");
    expect(body).toContain("Usage");
    expect(body).toContain("kerrostalo");
    expect(body).not.toContain("Sija | Yksikkö");
  });

  it("generates a large PDF without building a React document tree", async () => {
    const options = {
      ...DEFAULT_VOCABULARY_EXPORT_OPTIONS,
      format: "pdf" as const,
    };
    const words = Array.from({ length: 250 }, (_, index) => ({
      word: `word-${index + 1}`,
      partOfSpeechLabel: "Noun",
      meanings: [`meaning ${index + 1}`],
      tagLabels: ["A1"],
      notes: index % 20 === 0 ? "Short note." : "",
      updatedAtLabel: "2026-09-14",
    }));

    const document = await buildVocabularyExportDocument(
      "Oma Kirja",
      words,
      options,
    );
    const started = Date.now();
    const blob = await generateVocabularyPdfBlob(
      document,
      {
        ...labels,
        wordCount: "250 words",
      },
      options,
    );
    expect(blob.size).toBeGreaterThan(5000);
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
