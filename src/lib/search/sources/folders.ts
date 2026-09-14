import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { workspaceFolders } from "@/db/schema";
import { folderHref } from "@/lib/folders/paths";
import { matchScoreSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const folderSearchSource: SearchSource = {
  type: "folder",
  async search(scope, query, limit) {
    const title = workspaceFolders.name;
    const metadataMatch = sql<boolean>`${workspaceFolders.section}::text ilike ${query.like}`;
    const bodyMatch = sql<boolean>`false`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: workspaceFolders.id,
        title: workspaceFolders.name,
        section: workspaceFolders.section,
        score,
      })
      .from(workspaceFolders)
      .where(
        and(
          eq(workspaceFolders.userId, scope.userId),
          eq(workspaceFolders.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or to_tsvector('simple', ${workspaceFolders.name}) @@ to_tsquery('simple', ${query.tsQuery})
          )`,
        ),
      )
      .orderBy(desc(score), desc(workspaceFolders.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => ({
      type: "folder",
      id: row.id,
      title: row.title,
      subtitle: null,
      group: row.section,
      groupKind: "section",
      snippetCandidates: [],
      href: folderHref(row.section, row.id),
      score: Number(row.score) || 0,
    }));
  },
};
