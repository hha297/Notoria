import { describe, expect, it } from "vitest";
import { exerciseImportSourceRevision } from "./source-revision";

describe("exerciseImportSourceRevision", () => {
  const base = {
    extractedText: "The source material",
    additionalInstructions: "Use concise questions",
    studyLanguage: "fi",
  };

  it("is stable for identical generation inputs", () => {
    expect(exerciseImportSourceRevision(base)).toBe(
      exerciseImportSourceRevision({ ...base }),
    );
  });

  it("changes when meaningful source inputs change", () => {
    const revision = exerciseImportSourceRevision(base);
    expect(
      exerciseImportSourceRevision({ ...base, extractedText: "Edited source" }),
    ).not.toBe(revision);
    expect(
      exerciseImportSourceRevision({
        ...base,
        additionalInstructions: "Use detailed questions",
      }),
    ).not.toBe(revision);
    expect(
      exerciseImportSourceRevision({ ...base, studyLanguage: "sv" }),
    ).not.toBe(revision);
  });

  it("normalizes harmless surrounding whitespace", () => {
    expect(
      exerciseImportSourceRevision({
        ...base,
        extractedText: `  ${base.extractedText}  `,
      }),
    ).toBe(exerciseImportSourceRevision(base));
  });
});
