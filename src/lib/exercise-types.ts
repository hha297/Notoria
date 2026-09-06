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
  | "fill-in-blank"
  | "multiple-choice"
  | "match-pairs"
  | "type-answer"
  | "form-sentence";

export type ExerciseTypeConfig = {
  slug: ExerciseTypeSlug;
  icon: LucideIcon;
  /** Whole mode requires Pro (AI evaluation). */
  pro?: boolean;
};

export const EXERCISE_TYPES: ExerciseTypeConfig[] = [
  { slug: "flashcard", icon: Layers },
  { slug: "fill-in-blank", icon: TextCursorInput },
  { slug: "multiple-choice", icon: ListChecks },
  { slug: "match-pairs", icon: Link2 },
  { slug: "type-answer", icon: Keyboard },
  { slug: "form-sentence", icon: PenLine, pro: true },
];

const slugMap = new Map(EXERCISE_TYPES.map((item) => [item.slug, item]));

export function getExerciseTypeBySlug(
  slug: string,
): ExerciseTypeConfig | undefined {
  return slugMap.get(slug as ExerciseTypeSlug);
}
