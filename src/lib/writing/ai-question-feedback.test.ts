import { describe, expect, it } from "vitest";
import type { WritingAiSuggestion } from "@/lib/writing/ai-types";
import {
  attributeSuggestionsToQuestions,
  removeSuggestionFromMap,
} from "@/lib/writing/ai-question-feedback";
import type { WritingSection } from "@/lib/writing/content";

function suggestion(
  partial: Partial<WritingAiSuggestion> &
    Pick<WritingAiSuggestion, "id" | "original" | "replacement">,
): WritingAiSuggestion {
  return {
    type: "grammar",
    severity: "error",
    explanation: "",
    confidence: 1,
    ...partial,
  };
}

describe("attributeSuggestionsToQuestions", () => {
  const sections: WritingSection[] = [
    {
      id: "s1",
      title: "",
      sortOrder: 0,
      questions: [
        {
          id: "q1",
          prompt: "Hello world",
          exampleAnswer: "",
          notes: "",
          sortOrder: 0,
        },
        {
          id: "q2",
          prompt: "Lunch plans",
          exampleAnswer: "Valitetta I was late",
          notes: "",
          sortOrder: 1,
        },
      ],
    },
  ];

  it("places each suggestion inside the matching question", () => {
    const map = attributeSuggestionsToQuestions(sections, [
      suggestion({
        id: "a",
        original: "Valitetta",
        replacement: "Valitettavasti",
      }),
      suggestion({
        id: "b",
        original: "Hello",
        replacement: "Hi",
        type: "style",
        severity: "suggestion",
      }),
    ]);

    expect(map.q2?.map((item) => item.id)).toEqual(["a"]);
    expect(map.q1?.map((item) => item.id)).toEqual(["b"]);
  });

  it("drops suggestions that match no question", () => {
    const map = attributeSuggestionsToQuestions(sections, [
      suggestion({
        id: "x",
        original: "missing phrase",
        replacement: "fixed",
      }),
    ]);
    expect(map).toEqual({});
  });

  it("removes a single suggestion without touching other questions", () => {
    const map = {
      q1: [suggestion({ id: "a", original: "Hello", replacement: "Hi" })],
      q2: [
        suggestion({
          id: "b",
          original: "Valitetta",
          replacement: "Valitettavasti",
        }),
      ],
    };

    const next = removeSuggestionFromMap(map, "q2", "b");
    expect(next.q1).toHaveLength(1);
    expect(next.q2).toBeUndefined();
  });
});
