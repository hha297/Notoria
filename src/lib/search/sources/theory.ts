import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { grammarNotes, workspaceFolders } from "@/db/schema";
import { folderHref } from "@/lib/folders/paths";
import { jsonbDocTextAgg, jsonbFtsMatch, matchScoreSql } from "@/lib/search/sql";
import type { SearchHit, SearchSource } from "@/lib/search/types";

export const theorySearchSource: SearchSource = {
  type: "theory",
  async search(scope, query, limit) {
    const title = grammarNotes.title;
    const description = sql<string>`coalesce(${grammarNotes.content}->>'description', '')`;
    const category = sql<string>`coalesce(${grammarNotes.content}->>'category', '')`;
    const metadataMatch = sql<boolean>`(
      ${category} ilike ${query.like}
      or coalesce(${workspaceFolders.name}, '') ilike ${query.like}
    )`;
    const bodyMatch = sql<boolean>`(
      ${description} ilike ${query.like}
      or ${jsonbFtsMatch(grammarNotes.content, query.tsQuery)}
    )`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: grammarNotes.id,
        title: grammarNotes.title,
        folderId: grammarNotes.folderId,
        folderName: workspaceFolders.name,
        category,
        description,
        body: jsonbDocTextAgg(grammarNotes.content),
        score,
      })
      .from(grammarNotes)
      .leftJoin(
        workspaceFolders,
        eq(workspaceFolders.id, grammarNotes.folderId),
      )
      .where(
        and(
          eq(grammarNotes.userId, scope.userId),
          eq(grammarNotes.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(grammarNotes.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => {
      const folderName = row.folderName?.trim() || null;
      const categoryValue = row.category?.trim() || null;

      return {
        type: "theory",
        id: row.id,
        title: row.title,
        subtitle: row.description?.trim() || null,
        group: folderName ?? categoryValue,
        groupKind: folderName ? "folder" : categoryValue ? "category" : null,
        snippetCandidates: [row.description, row.body],
        href: `/theory/${row.id}`,
        score: Number(row.score) || 0,
      };
    });
  },
};
