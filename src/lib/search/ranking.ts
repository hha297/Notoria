import type { PreparedQuery } from "@/lib/search/types";

export const SEARCH_RANK = {
  exactTitle: 100,
  prefixTitle: 85,
  containsTitle: 70,
  metadata: 55,
  body: 30,
} as const;

export function titleRank(title: string, query: PreparedQuery): number {
  const normalizedTitle = title.trim().toLocaleLowerCase();
  if (!normalizedTitle) return 0;
  if (normalizedTitle === query.normalized) return SEARCH_RANK.exactTitle;
  if (normalizedTitle.startsWith(query.normalized)) return SEARCH_RANK.prefixTitle;
  if (normalizedTitle.includes(query.normalized)) return SEARCH_RANK.containsTitle;
  return 0;
}

export function combineRank(parts: {
  title: number;
  metadata: boolean;
  body: boolean;
}): number {
  return Math.max(
    parts.title,
    parts.metadata ? SEARCH_RANK.metadata : 0,
    parts.body ? SEARCH_RANK.body : 0,
  );
}

export function compareSearchScores(
  left: { score: number; title: string },
  right: { score: number; title: string },
) {
  if (right.score !== left.score) return right.score - left.score;
  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}
