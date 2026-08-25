import {
  estimateTheoryExerciseCount,
  extractTheoryContent,
} from "@/lib/theory-exercises/extract";
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
  const extracted = extractTheoryContent(parsed.doc);
  const description =
    parsed.description || theoryExcerpt(theoryDocPlainText(parsed.doc));

  return {
    id: note.id,
    title: note.title,
    description,
    category: parsed.category,
    readingMinutes: estimateReadingMinutes(parsed.doc),
    estimatedExercises: estimateTheoryExerciseCount(extracted),
    sectionCount: extracted.sections.filter((s) => s.heading !== "Notes").length ||
      extracted.sections.length,
    updatedAt:
      typeof note.updatedAt === "string"
        ? note.updatedAt
        : note.updatedAt.toISOString(),
  };
}
