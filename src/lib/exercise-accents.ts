import {
  EXERCISE_TYPES,
  type ExerciseTypeSlug,
} from "@/lib/exercise-types";

/**
 * Module token pairs that back each exercise accent.
 * CSS `[data-exercise="…"]` / `html[data-portal-exercise="…"]` /
 * header `data-studio-scene` must stay in sync.
 *
 * Overview numbered entries and detail pages share this mapping:
 * - flashcard → exercise (yellow)
 * - fill-in-blank → listen (blue)
 * - multiple-choice → theory (purple)
 * - match-pairs → vocab (green/mint)
 * - type-answer → writing (pink)
 * - form-sentence → speak (orange)
 */
export const EXERCISE_ACCENT_MODULE = {
  flashcard: "exercise",
  "fill-in-blank": "listen",
  "multiple-choice": "theory",
  "match-pairs": "vocab",
  "type-answer": "writing",
  "form-sentence": "speak",
} as const satisfies Record<ExerciseTypeSlug, string>;

const DETAIL_SLUGS = new Set<string>([
  ...EXERCISE_TYPES.map((item) => item.slug),
  "theory",
  "import",
]);

/**
 * Active exercise detail slug from a dashboard pathname, or null on the
 * exercises overview / unrelated routes.
 */
export function exerciseDetailSlugFromPath(
  pathname: string,
): ExerciseTypeSlug | "theory" | "import" | null {
  if (!pathname.startsWith("/exercises/")) return null;
  const segment = pathname.slice("/exercises/".length).split("/")[0];
  if (!segment || !DETAIL_SLUGS.has(segment)) return null;
  return segment as ExerciseTypeSlug | "theory" | "import";
}
