import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { exerciseImports } from "@/db/schema";
import { matchScoreSql, snippetAroundSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const exerciseSearchSource: SearchSource = {
  type: "exercise",
  async search(scope, query, limit) {
    const title = exerciseImports.title;
    const metadataMatch = sql<boolean>`(
      coalesce(${exerciseImports.originalFilename}, '') ilike ${query.like}
      or ${exerciseImports.sourceType}::text ilike ${query.like}
    )`;
    const bodyMatch = sql<boolean>`(
      to_tsvector(
        'simple',
        coalesce(${exerciseImports.title}, '') || ' ' ||
        coalesce(${exerciseImports.extractedText}, '')
      ) @@ to_tsquery('simple', ${query.tsQuery})
    )`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: exerciseImports.id,
        title: exerciseImports.title,
        filename: exerciseImports.originalFilename,
        extractSnippet: snippetAroundSql(exerciseImports.extractedText, query),
        score,
      })
      .from(exerciseImports)
      .where(
        and(
          eq(exerciseImports.userId, scope.userId),
          eq(exerciseImports.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(exerciseImports.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => ({
      type: "exercise",
      id: row.id,
      title: row.title,
      subtitle: row.filename?.trim() || null,
      group: null,
      groupKind: null,
      snippetCandidates: [row.filename, row.extractSnippet],
      href: `/exercises/import/${row.id}`,
      score: Number(row.score) || 0,
    }));
  },
};
