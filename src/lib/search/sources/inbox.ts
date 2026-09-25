import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { studyInboxItems } from "@/db/schema";
import { matchScoreSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const inboxSearchSource: SearchSource = {
  type: "inbox",
  async search(scope, query, limit) {
    const title = studyInboxItems.content;
    const note = sql<string>`coalesce(${studyInboxItems.note}, '')`;
    const source = sql<string>`coalesce(${studyInboxItems.source}, '')`;
    const metadataMatch = sql<boolean>`(
      ${note} ilike ${query.like}
      or ${source} ilike ${query.like}
      or ${studyInboxItems.status}::text ilike ${query.like}
    )`;
    const bodyMatch = sql<boolean>`(
      ${note} ilike ${query.like}
      or ${source} ilike ${query.like}
    )`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: studyInboxItems.id,
        content: studyInboxItems.content,
        note: studyInboxItems.note,
        source: studyInboxItems.source,
        status: studyInboxItems.status,
        score,
      })
      .from(studyInboxItems)
      .where(
        and(
          eq(studyInboxItems.userId, scope.userId),
          eq(studyInboxItems.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or to_tsvector(
              'simple',
              coalesce(${studyInboxItems.content}, '') || ' ' ||
              coalesce(${studyInboxItems.note}, '') || ' ' ||
              coalesce(${studyInboxItems.source}, '')
            ) @@ to_tsquery('simple', ${query.tsQuery})
          )`,
        ),
      )
      .orderBy(desc(score), desc(studyInboxItems.createdAt))
      .limit(limit);

    return rows.map((row): SearchHit => ({
      type: "inbox",
      id: row.id,
      title: row.content.slice(0, 120),
      subtitle: row.note?.trim() || row.source?.trim() || null,
      group: row.status,
      groupKind: null,
      snippetCandidates: [row.note, row.source],
      href: "/inbox",
      score: Number(row.score) || 0,
    }));
  },
};
