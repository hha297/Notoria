import type { JSONContent } from "@tiptap/react";
import type { TheoryExerciseSession } from "@/lib/theory-exercises/types";

export type BuildTheorySessionInput = {
  theoryId: string;
  theoryTitle: string;
  /** Kept for API compatibility; content is sent to AI from the practice client/API. */
  doc?: JSONContent;
};

/**
 * AI-only Theory practice: sessions start empty and are filled by AI generation.
 */
export function buildTheoryExerciseSession(
  input: BuildTheorySessionInput,
): TheoryExerciseSession {
  return {
    theoryId: input.theoryId,
    theoryTitle: input.theoryTitle,
    items: [],
  };
}
