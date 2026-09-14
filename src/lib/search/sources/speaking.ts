import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { speakingSessions } from "@/db/schema";
import { matchScoreSql, snippetAroundSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const speakingSearchSource: SearchSource = {
  type: "speaking",
  async search(scope, query, limit) {
    const title = speakingSessions.title;
    const metadataMatch = sql<boolean>`(
      coalesce(${speakingSessions.topic}, '') ilike ${query.like}
      or coalesce(${speakingSessions.cefrLevel}, '') ilike ${query.like}
    )`;
    const bodyMatch = sql<boolean>`(
      to_tsvector(
        'simple',
        coalesce(${speakingSessions.title}, '') || ' ' ||
        coalesce(${speakingSessions.topic}, '') || ' ' ||
        coalesce(${speakingSessions.notes}, '') || ' ' ||
        coalesce(${speakingSessions.transcript}, '') || ' ' ||
        coalesce(${speakingSessions.summary}, '')
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
        id: speakingSessions.id,
        title: speakingSessions.title,
        topic: speakingSessions.topic,
        cefrLevel: speakingSessions.cefrLevel,
        notesSnippet: snippetAroundSql(speakingSessions.notes, query),
        summarySnippet: snippetAroundSql(speakingSessions.summary, query),
        transcriptSnippet: snippetAroundSql(speakingSessions.transcript, query),
        score,
      })
      .from(speakingSessions)
      .where(
        and(
          eq(speakingSessions.userId, scope.userId),
          eq(speakingSessions.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(speakingSessions.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => {
      const subtitleParts = [row.topic?.trim(), row.cefrLevel?.trim()].filter(
        Boolean,
      );
      return {
        type: "speaking",
        id: row.id,
        title: row.title,
        subtitle: subtitleParts.join(" · ") || null,
        group: null,
        groupKind: null,
        snippetCandidates: [
          row.notesSnippet,
          row.summarySnippet,
          row.transcriptSnippet,
        ],
        href: `/speaking/${row.id}`,
        score: Number(row.score) || 0,
      };
    });
  },
};
