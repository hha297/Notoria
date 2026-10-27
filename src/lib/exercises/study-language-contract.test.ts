import { describe, expect, it } from "vitest";
import {
  buildLearnerFacingLanguageContract,
  describeStudyLanguage,
} from "@/lib/exercises/study-language-contract";

describe("learner-facing exercise language contract", () => {
  it("expands a workspace language code for the model", () => {
    expect(describeStudyLanguage("fi")).toBe("Finnish (Suomi; fi)");
  });

  it("locks every visible multiple-choice field to the workspace language", () => {
    const contract = buildLearnerFacingLanguageContract("fi");
    expect(contract).toContain(
      "authoritative study/workspace language is Finnish",
    );
    expect(contract).toContain(
      "prompt, sentence, instruction, options, correctOption",
    );
    expect(contract).toContain("Do not use English");
  });

  it("does not silently default an unknown or missing language to English", () => {
    expect(describeStudyLanguage("legacy-language")).toBe("legacy-language");
    expect(buildLearnerFacingLanguageContract()).toContain(
      "never default to English",
    );
  });
});
