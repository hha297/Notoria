import { describe, expect, it } from "vitest";
import { filterWritingSuggestions, normalizeWritingAiResult } from "@/lib/writing/ai-filter";
import { WRITING_CHECK_PROMPT, writingActionPrompt } from "@/lib/writing/ai-prompt";
import {
  writingAiRequestSchema,
  writingAiResultSchema,
  type WritingAiSuggestion,
} from "@/lib/writing/ai-types";
import { findRangeInSegments } from "@/lib/writing/ai-apply";
import {
  jsonContentToPlainText,
  lastSentence,
  replaceFirstOccurrence,
  writingFocusText,
} from "@/lib/writing/plain-text";

function suggestion(
  overrides: Partial<WritingAiSuggestion> &
    Pick<WritingAiSuggestion, "original" | "replacement">,
): WritingAiSuggestion {
  return {
    id: "1",
    type: "grammar",
    severity: "error",
    explanation: "",
    confidence: 0.98,
    ...overrides,
  };
}

describe("writing AI request schema", () => {
  it("accepts check requests with writing metadata", () => {
    const parsed = writingAiRequestSchema.parse({
      action: "check",
      content: "I went to Helsinki yesterday.",
      language: "en",
      level: "A2",
      topic: "travel",
      formality: "Neutral",
      title: "Trip",
    });

    expect(parsed.level).toBe("a2");
    expect(parsed.formality).toBe("neutral");
    expect(parsed.topic).toBe("travel");
  });

  it("rejects empty content", () => {
    const parsed = writingAiRequestSchema.safeParse({
      action: "check",
      content: "   ",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("writing AI result contract", () => {
  it("treats a correct sentence as having no suggestions", () => {
    const parsed = writingAiResultSchema.parse({
      language: "English",
      suggestions: [],
    });
    expect(normalizeWritingAiResult(parsed).suggestions).toEqual([]);
  });

  it("keeps a grammar correction for I have went", () => {
    const parsed = writingAiResultSchema.parse({
      language: "English",
      suggestions: [
        {
          type: "grammar",
          severity: "error",
          original: "I have went to Helsinki yesterday.",
          replacement: "I went to Helsinki yesterday.",
          explanation: "Use the simple past with yesterday.",
          confidence: 0.98,
        },
      ],
    });

    expect(normalizeWritingAiResult(parsed).suggestions[0]?.replacement).toBe(
      "I went to Helsinki yesterday.",
    );
  });

  it("keeps a spelling correction for realy", () => {
    const parsed = writingAiResultSchema.parse({
      language: "English",
      suggestions: [
        {
          type: "spelling",
          severity: "error",
          original: "realy",
          replacement: "really",
          confidence: 0.97,
        },
      ],
    });

    expect(normalizeWritingAiResult(parsed).suggestions[0]?.replacement).toBe(
      "really",
    );
  });

  it("keeps a naturalness fix for I very like this", () => {
    const parsed = writingAiResultSchema.parse({
      language: "English",
      suggestions: [
        {
          type: "grammar",
          severity: "error",
          original: "I very like this.",
          replacement: "I really like this.",
          confidence: 0.94,
        },
      ],
    });

    expect(normalizeWritingAiResult(parsed).suggestions[0]?.replacement).toBe(
      "I really like this.",
    );
  });

  it("does not treat a valid sentence as an error just because style differs", () => {
    const filtered = filterWritingSuggestions([
      suggestion({
        type: "style",
        severity: "error",
        original: "I really like this restaurant.",
        replacement: "I adore this restaurant.",
        confidence: 0.9,
      }),
    ]);

    expect(filtered[0]?.severity).toBe("error");
    expect(WRITING_CHECK_PROMPT).toContain(
      "Do not treat stylistic preferences as grammar errors",
    );
  });
});

describe("writing AI prompts", () => {
  it("forbids meaning and certainty changes", () => {
    expect(WRITING_CHECK_PROMPT).toContain("might");
    expect(WRITING_CHECK_PROMPT).toContain("will");
    expect(WRITING_CHECK_PROMPT).toContain("Preserve tense, modality, certainty");
  });

  it("is CEFR-aware and multilingual", () => {
    expect(WRITING_CHECK_PROMPT).toContain("CEFR");
    expect(WRITING_CHECK_PROMPT).toContain("A1/A2");
    expect(WRITING_CHECK_PROMPT).toContain("Do not assume English");
  });

  it("uses a separate continue prompt", () => {
    expect(writingActionPrompt("continue")).toContain("continuation");
    expect(writingActionPrompt("continue")).not.toContain(
      "Analyze the user's writing for",
    );
  });

  it("asks check to scan the whole writing", () => {
    expect(writingActionPrompt("check")).toContain("ENTIRE writing");
    expect(writingActionPrompt("check")).toContain("separate suggestion");
  });

  it("asks improve to rewrite the focus sentence", () => {
    expect(writingActionPrompt("improve")).toContain("focus sentence");
    expect(writingActionPrompt("improve")).toContain("Do not invent a continuation");
  });

  it("asks grammar check to ignore optional style", () => {
    expect(writingActionPrompt("correct")).toContain("grammar and spelling errors only");
    expect(writingActionPrompt("correct")).toContain("Do not suggest optional style");
  });
});

describe("filterWritingSuggestions", () => {
  it("hides low-confidence optional style suggestions", () => {
    const filtered = filterWritingSuggestions([
      suggestion({
        type: "style",
        severity: "suggestion",
        original: "nice",
        replacement: "splendid",
        confidence: 0.4,
      }),
    ]);
    expect(filtered).toEqual([]);
  });

  it("keeps high-confidence grammar errors", () => {
    const filtered = filterWritingSuggestions([
      suggestion({
        original: "have went",
        replacement: "went",
        confidence: 0.96,
      }),
    ]);
    expect(filtered).toHaveLength(1);
  });

  it("drops style suggestions from a grammar-only check", () => {
    const filtered = filterWritingSuggestions(
      [
        suggestion({
          type: "style",
          severity: "suggestion",
          original: "very nice",
          replacement: "excellent",
          confidence: 0.9,
        }),
        suggestion({
          original: "have went",
          replacement: "went",
          confidence: 0.96,
        }),
      ],
      { action: "correct" },
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.replacement).toBe("went");
  });

  it("drops suggestions whose original text is not in the writing", () => {
    const filtered = filterWritingSuggestions(
      [
        suggestion({
          original: "have went",
          replacement: "went",
          confidence: 0.96,
        }),
      ],
      { content: "I went to Helsinki yesterday." },
    );
    expect(filtered).toEqual([]);
  });
});

describe("plain text helpers", () => {
  it("extracts text from a TipTap document", () => {
    expect(
      jsonContentToPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "I went to Helsinki yesterday." }],
          },
        ],
      }),
    ).toBe("I went to Helsinki yesterday.");
  });

  it("replaces the first occurrence only", () => {
    expect(
      replaceFirstOccurrence("I have went. I have went.", "have went", "went"),
    ).toBe("I went. I have went.");
  });

  it("uses the last sentence when improving without a selection", () => {
    expect(lastSentence("Hello. I very like this.")).toBe("I very like this.");
    expect(writingFocusText("improve", "Hello. I very like this.", null)).toBe(
      "I very like this.",
    );
    expect(writingFocusText("check", "Hello. I very like this.", "Hello.")).toBe(
      "Hello. I very like this.",
    );
  });

  it("finds a phrase across adjacent text segments", () => {
    expect(
      findRangeInSegments(
        [
          { pos: 1, text: "I have " },
          { pos: 8, text: "went" },
        ],
        "have went",
      ),
    ).toEqual({ from: 3, to: 12 });
  });
});
