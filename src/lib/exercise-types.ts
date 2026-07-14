import type { LucideIcon } from "lucide-react";
import {
  Keyboard,
  Layers,
  Link2,
  ListChecks,
  PenLine,
  TextCursorInput,
} from "lucide-react";

export type ExerciseTypeSlug =
  | "flashcard"
  | "writing"
  | "fill-in-blank"
  | "multiple-choice"
  | "match-pairs"
  | "type-answer";

export type ExerciseTypeConfig = {
  slug: ExerciseTypeSlug;
  icon: LucideIcon;
};

export const EXERCISE_TYPES: ExerciseTypeConfig[] = [
  { slug: "flashcard", icon: Layers },
  { slug: "writing", icon: PenLine },
  { slug: "fill-in-blank", icon: TextCursorInput },
  { slug: "multiple-choice", icon: ListChecks },
  { slug: "match-pairs", icon: Link2 },
  { slug: "type-answer", icon: Keyboard },
];

const slugMap = new Map(EXERCISE_TYPES.map((item) => [item.slug, item]));

export function getExerciseTypeBySlug(
  slug: string,
): ExerciseTypeConfig | undefined {
  return slugMap.get(slug as ExerciseTypeSlug);
}

/** @deprecated Use slug-based vocabulary exercises. Kept for saved writing entries. */
export function getExerciseTypeLabel(type: string): string {
  if (type === "WRITING") return "Writing";
  return type.replaceAll("_", " ");
}
