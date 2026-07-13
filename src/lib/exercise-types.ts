import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Languages,
  Layers,
  PenLine,
  SpellCheck,
  TextCursorInput,
} from "lucide-react";
import type { ExerciseFormValues } from "@/schemas/exercise";

export type ExerciseTypeSlug =
  | "flashcard"
  | "fill-in-blank"
  | "writing"
  | "translation"
  | "reading"
  | "grammar";

export type ExerciseTypeConfig = {
  slug: ExerciseTypeSlug;
  type: ExerciseFormValues["type"];
  label: string;
  description: string;
  icon: LucideIcon;
  preview: string;
};

export const EXERCISE_TYPES: ExerciseTypeConfig[] = [
  {
    slug: "flashcard",
    type: "QUESTIONS",
    label: "Flashcard",
    description: "Quick recall prompts on flip-style cards.",
    icon: Layers,
    preview: "Q → A",
  },
  {
    slug: "fill-in-blank",
    type: "FILL_BLANK",
    label: "Fill in the blank",
    description: "Complete sentences with missing words.",
    icon: TextCursorInput,
    preview: "Minä ___ suomea.",
  },
  {
    slug: "writing",
    type: "WRITING",
    label: "Writing",
    description: "Open prompts for paragraphs and essays.",
    icon: PenLine,
    preview: "Tell about yourself…",
  },
  {
    slug: "translation",
    type: "TRANSLATION",
    label: "Translation",
    description: "Translate phrases between languages.",
    icon: Languages,
    preview: "EN ↔ FI",
  },
  {
    slug: "reading",
    type: "READING",
    label: "Reading",
    description: "Passages with comprehension questions.",
    icon: BookOpen,
    preview: "Read & answer",
  },
  {
    slug: "grammar",
    type: "GRAMMAR_DRILL",
    label: "Grammar drill",
    description: "Targeted grammar patterns and drills.",
    icon: SpellCheck,
    preview: "Case · tense",
  },
];

const slugMap = new Map(EXERCISE_TYPES.map((item) => [item.slug, item]));
const typeMap = new Map(EXERCISE_TYPES.map((item) => [item.type, item]));

export function getExerciseTypeBySlug(
  slug: string,
): ExerciseTypeConfig | undefined {
  return slugMap.get(slug as ExerciseTypeSlug);
}

export function getExerciseTypeLabel(type: ExerciseFormValues["type"]): string {
  return typeMap.get(type)?.label ?? type.replaceAll("_", " ");
}
