import {
  parseTheoryContent,
  theoryExcerpt,
  theoryDocPlainText,
  estimateReadingMinutes,
} from "@/lib/theory/content";
import type { TheoryExerciseCardItem } from "@/components/exercises/theory-exercise-picker";

export function toTheoryExerciseCard(note: {
  id: string;
  title: string;
  content: unknown;
  updatedAt: Date | string;
}): TheoryExerciseCardItem {
  const parsed = parseTheoryContent(note.content);
  const plain = theoryDocPlainText(parsed.doc);
  const description = parsed.description || theoryExcerpt(plain);
  const wordCount = plain.split(/\s+/).filter(Boolean).length;

  return {
    id: note.id,
    title: note.title,
    description,
    category: parsed.category,
    readingMinutes: estimateReadingMinutes(parsed.doc),
    // Soft estimate for card UI only — actual count comes from AI generation.
    estimatedExercises: Math.min(30, Math.max(10, Math.round(wordCount / 25))),
    sectionCount: Math.max(1, Math.round(wordCount / 80)),
    updatedAt:
      typeof note.updatedAt === "string"
        ? note.updatedAt
        : note.updatedAt.toISOString(),
  };
}
