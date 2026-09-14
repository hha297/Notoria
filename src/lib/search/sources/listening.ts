import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listeningLessons, workspaceFolders } from "@/db/schema";
import { matchScoreSql, snippetAroundSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const listeningSearchSource: SearchSource = {
  type: "listening",
  async search(scope, query, limit) {
    const title = listeningLessons.title;
    const metadataMatch = sql<boolean>`(
      coalesce(${listeningLessons.topic}, '') ilike ${query.like}
      or coalesce(${listeningLessons.cefrLevel}, '') ilike ${query.like}
      or coalesce(${workspaceFolders.name}, '') ilike ${query.like}
    )`;
    const bodyMatch = sql<boolean>`(
      to_tsvector(
        'simple',
        coalesce(${listeningLessons.title}, '') || ' ' ||
        coalesce(${listeningLessons.topic}, '') || ' ' ||
        coalesce(${listeningLessons.transcript}, '')
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
        id: listeningLessons.id,
        title: listeningLessons.title,
        topic: listeningLessons.topic,
        cefrLevel: listeningLessons.cefrLevel,
        folderName: workspaceFolders.name,
        transcriptSnippet: snippetAroundSql(listeningLessons.transcript, query),
        score,
      })
      .from(listeningLessons)
      .leftJoin(
        workspaceFolders,
        eq(workspaceFolders.id, listeningLessons.folderId),
      )
      .where(
        and(
          eq(listeningLessons.userId, scope.userId),
          eq(listeningLessons.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(listeningLessons.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => {
      const folderName = row.folderName?.trim() || null;
      const subtitleParts = [row.topic?.trim(), row.cefrLevel?.trim()].filter(
        Boolean,
      );
      return {
        type: "listening",
        id: row.id,
        title: row.title,
        subtitle: subtitleParts.join(" · ") || null,
        group: folderName,
        groupKind: folderName ? "folder" : null,
        snippetCandidates: [row.topic, row.transcriptSnippet],
        href: `/listening/${row.id}`,
        score: Number(row.score) || 0,
      };
    });
  },
};
