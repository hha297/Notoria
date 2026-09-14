import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, workspaceFolders } from "@/db/schema";
import {
  jsonbDocTextAgg,
  jsonbFtsMatch,
  jsonbPromptTextAgg,
  matchScoreSql,
} from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const writingSearchSource: SearchSource = {
  type: "writing",
  async search(scope, query, limit) {
    const title = exercises.title;
    const description = sql<string>`coalesce(${exercises.description}, '')`;
    const metadataMatch = sql<boolean>`coalesce(${workspaceFolders.name}, '') ilike ${query.like}`;
    const bodyMatch = sql<boolean>`(
      ${description} ilike ${query.like}
      or ${jsonbFtsMatch(exercises.content, query.tsQuery)}
    )`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: exercises.id,
        title: exercises.title,
        description: exercises.description,
        folderName: workspaceFolders.name,
        body: jsonbDocTextAgg(exercises.content),
        prompts: jsonbPromptTextAgg(exercises.content),
        score,
      })
      .from(exercises)
      .leftJoin(workspaceFolders, eq(workspaceFolders.id, exercises.folderId))
      .where(
        and(
          eq(exercises.userId, scope.userId),
          eq(exercises.workspaceId, scope.workspaceId),
          eq(exercises.type, "WRITING"),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(exercises.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => {
      const folderName = row.folderName?.trim() || null;
      return {
        type: "writing",
        id: row.id,
        title: row.title,
        subtitle: row.description?.trim() || null,
        group: folderName,
        groupKind: folderName ? "folder" : null,
        snippetCandidates: [row.description, row.body, row.prompts],
        href: `/writing/${row.id}`,
        score: Number(row.score) || 0,
      };
    });
  },
};
