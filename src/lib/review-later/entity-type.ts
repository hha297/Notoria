import type { LearningEntityType } from "@/db/schema";

const REVIEW_ENTITY_TYPES = [
  "vocabulary",
  "theory",
  "writing",
  "exercise",
  "listening",
  "speaking",
] as const satisfies readonly LearningEntityType[];

export type ReviewLaterEntityType = (typeof REVIEW_ENTITY_TYPES)[number];

export function isReviewLaterEntityType(
  value: string,
): value is ReviewLaterEntityType {
  return (REVIEW_ENTITY_TYPES as readonly string[]).includes(value);
}

export { REVIEW_ENTITY_TYPES };
