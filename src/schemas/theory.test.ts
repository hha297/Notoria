import { describe, expect, it } from "vitest";
import {
  THEORY_DESCRIPTION_MAX,
  theoryFormErrorCode,
  theoryFormSchema,
} from "@/schemas/theory";

const base = {
  title: "Plural partitive",
  category: "grammar",
  content: {
    kind: "theory",
    version: 1,
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  },
};

describe("theoryFormSchema", () => {
  it("accepts a summary at the max length", () => {
    const result = theoryFormSchema.safeParse({
      ...base,
      description: "a".repeat(THEORY_DESCRIPTION_MAX),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a summary longer than the max", () => {
    const result = theoryFormSchema.safeParse({
      ...base,
      description: "a".repeat(THEORY_DESCRIPTION_MAX + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(theoryFormErrorCode(result.error)).toBe("DESCRIPTION_TOO_LONG");
    }
  });

  it("accepts a long tip-tap body with a normal summary", () => {
    const result = theoryFormSchema.safeParse({
      ...base,
      description:
        "The plural partitive is used when talking about an indefinite amount of plural things, after paljon, with negative objects, with certain partitive verbs, and in several other situations. Its ending depends on the word type, with common patterns such as -ja/-jä, -ia/-iä, -ita/-itä, -sia/-siä and -eja/-ejä.",
      content: {
        kind: "theory",
        version: 1,
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "x".repeat(50_000) }],
            },
          ],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("maps missing title to TITLE_REQUIRED", () => {
    const result = theoryFormSchema.safeParse({
      ...base,
      title: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(theoryFormErrorCode(result.error)).toBe("TITLE_REQUIRED");
    }
  });
});
