import type { JSONContent } from "@tiptap/react";
import { analyzeTheory } from "@/lib/theory-exercises/analyze";
import { extractTheoryContent } from "@/lib/theory-exercises/extract";
import { generateSystemTheoryExercises } from "@/lib/theory-exercises/generate-system";
import type {
  TheoryExercise,
  TheoryExerciseSession,
  TheoryVocabWord,
} from "@/lib/theory-exercises/types";

export type BuildTheorySessionInput = {
  theoryId: string;
  theoryTitle: string;
  doc: JSONContent;
  vocabulary?: TheoryVocabWord[];
  /** Reserved for future AI-augmented items (same shape as system items). */
  aiItems?: TheoryExercise[];
  maxItems?: number;
};

/**
 * Content → analyze → material (vocab/theory/AI) → exercises → session.
 */
export function buildTheoryExerciseSession(
  input: BuildTheorySessionInput,
): TheoryExerciseSession {
  const maxItems = input.maxItems ?? 12;
  const extracted = extractTheoryContent(input.doc);
  const analysis = analyzeTheory(extracted, input.theoryTitle);
  const aiItems = (input.aiItems ?? []).filter(
    (item) => item.source === "theory" && item.theoryId === input.theoryId,
  );

  const systemBudget = Math.max(
    0,
    maxItems - Math.min(aiItems.length, Math.floor(maxItems / 2)),
  );
  const systemItems = generateSystemTheoryExercises(input.theoryId, extracted, {
    maxItems: systemBudget || maxItems,
    theoryTitle: input.theoryTitle,
    vocabulary: input.vocabulary,
  });

  const seen = new Set(systemItems.map((i) => i.id));
  const merged = [...systemItems];
  for (const item of aiItems) {
    if (merged.length >= maxItems) break;
    if (seen.has(item.id)) continue;
    merged.push(item);
    seen.add(item.id);
  }

  return {
    theoryId: input.theoryId,
    theoryTitle: input.theoryTitle,
    knowledgeKind: analysis.kind,
    items: merged,
  };
}

export { extractTheoryContent, estimateTheoryExerciseCount } from "@/lib/theory-exercises/extract";
export { generateSystemTheoryExercises } from "@/lib/theory-exercises/generate-system";
export { analyzeTheory } from "@/lib/theory-exercises/analyze";
