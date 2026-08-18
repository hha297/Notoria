import { describe, expect, it } from "vitest";
import {
  alignFillBlankAnswers,
  buildFillBlankFromTranscript,
  extractFillBlankQuestions,
  keepGroundedFillBlanks,
  normalizeFillBlankPlaceholders,
  parseJsonObject,
} from "@/lib/listening/fill-blank-generate";
import { transcriptContains } from "@/lib/listening/utils";

function grounded(blank: string, transcript: string) {
  return transcriptContains(transcript, blank);
}

describe("fill-blank generation repair", () => {
  it("normalizes mixed blank placeholders", () => {
    expect(
      normalizeFillBlankPlaceholders("Minun [blank] on __ ja {{blank}}."),
    ).toBe("Minun ______ on ______ ja ______.");
  });

  it("parses fenced JSON and extracts a top-level passage", () => {
    const parsed = parseJsonObject(`\`\`\`json
{"title":"Koti","sentenceWithBlanks":"Olen ______ Härkkö.","blanks":["Laura"]}
\`\`\``);
    expect(extractFillBlankQuestions(parsed)).toEqual([
      {
        speaker: undefined,
        sentenceWithBlanks: "Olen ______ Härkkö.",
        blanks: ["Laura"],
      },
    ]);
  });

  it("drops extra answers and extra blank markers", () => {
    expect(
      alignFillBlankAnswers("Olen ______ ja asun ______.", ["Laura", "Helsingissä", "extra"]),
    ).toEqual({
      sentenceWithBlanks: "Olen ______ ja asun ______.",
      blanks: ["Laura", "Helsingissä"],
    });

    expect(
      alignFillBlankAnswers("Olen ______ ja asun ______.", ["Laura"]),
    ).toEqual({
      sentenceWithBlanks: "Olen ______ ja asun.",
      blanks: ["Laura"],
    });
  });

  it("keeps grounded blanks and restores unknown answers", () => {
    const result = keepGroundedFillBlanks(
      "Olen ______ ja asun ______.",
      ["Laura", "Kuussa"],
      "Olen Laura Härkkö ja asun Helsingissä.",
      [],
      grounded,
    );

    expect(result).toEqual({
      sentenceWithBlanks: "Olen ______ ja asun Kuussa.",
      blanks: ["Laura"],
    });
  });

  it("builds a local cloze from the transcript", () => {
    const transcript =
      "Minun mielestäni kaikilla asuinalueella pitäisi olla samanlaiset palvelut.";
    const result = buildFillBlankFromTranscript(transcript, 3);
    expect(result).not.toBeNull();
    expect(result!.blanks.length).toBeGreaterThan(0);
    expect(result!.blanks.every((blank) => transcript.includes(blank))).toBe(true);
    expect((result!.sentenceWithBlanks.match(/_{3,}/g) ?? []).length).toBe(
      result!.blanks.length,
    );
  });
});
