import { getCurrentUserId } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/workspace";
import { ensureSearchIndexes } from "@/lib/search/indexes";
import { presentSearchHit } from "@/lib/search/present";
import { prepareSearchQuery } from "@/lib/search/query";
import { compareSearchScores } from "@/lib/search/ranking";
import { SEARCH_SOURCES } from "@/lib/search/sources";
import {
  GLOBAL_RESULT_LIMIT,
  PER_SOURCE_LIMIT,
  type SearchLabels,
  type SearchResult,
} from "@/lib/search/types";

export async function searchWorkspace(
  rawQuery: string,
  labels: SearchLabels,
): Promise<SearchResult[]> {
  const query = prepareSearchQuery(rawQuery);
  if (!query) return [];

  const [userId, workspace] = await Promise.all([
    getCurrentUserId(),
    getActiveWorkspace(),
  ]);
  if (!workspace) return [];

  void ensureSearchIndexes();

  const scope = { userId, workspaceId: workspace.id };
  const groups = await Promise.all(
    SEARCH_SOURCES.map((source) => source.search(scope, query, PER_SOURCE_LIMIT)),
  );

  return groups
    .flat()
    .sort((left, right) =>
      compareSearchScores(
        { score: left.score, title: left.title },
        { score: right.score, title: right.title },
      ),
    )
    .slice(0, GLOBAL_RESULT_LIMIT)
    .map((hit) => presentSearchHit(hit, query.raw, labels));
}
