import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyWords } from "@/db/schema";
import { matchScoreSql } from "@/lib/search/sql";
import { vocabularyNotesToPlainText } from "@/lib/vocabulary/notes-content";
import { normalizePartOfSpeechKey } from "@/lib/vocabulary/export/group-rows";
import {
  getCustomTagName,
  isCustomTagKey,
} from "@/lib/vocabulary-tags";
import type { SearchHit, SearchSource } from "@/lib/search/types";

const CEFR_TAG = /^[abc][12]$/i;

function formatCefrTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => CEFR_TAG.test(tag))
    .map((tag) => tag.toUpperCase());
}

function formatOtherTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !CEFR_TAG.test(tag))
    .map((tag) => (isCustomTagKey(tag) ? getCustomTagName(tag) : tag));
}

export const vocabularySearchSource: SearchSource = {
  type: "vocabulary",
  async search(scope, query, limit) {
    const title = vocabularyWords.word;
    const metadataMatch = sql<boolean>`(
      coalesce(${vocabularyWords.partOfSpeech}, '') ilike ${query.like}
      or exists (
        select 1 from vocabulary_word_tags
        where vocabulary_word_tags.word_id = ${vocabularyWords.id}
          and vocabulary_word_tags.tag ilike ${query.like}
      )
    )`;
    const bodyMatch = sql<boolean>`(
      coalesce(${vocabularyWords.synonyms}, '') ilike ${query.like}
      or exists (
        select 1 from word_meanings
        where word_meanings.word_id = ${vocabularyWords.id}
          and word_meanings.meaning ilike ${query.like}
      )
      or exists (
        select 1 from word_examples
        where word_examples.word_id = ${vocabularyWords.id}
          and (
            word_examples.sentence ilike ${query.like}
            or coalesce(word_examples.meaning, '') ilike ${query.like}
            or coalesce(word_examples.notes, '') ilike ${query.like}
          )
      )
    )`;
    const ftsMatch = sql<boolean>`(
      to_tsvector(
        'simple',
        coalesce(${vocabularyWords.word}, '') || ' ' ||
        coalesce(${vocabularyWords.partOfSpeech}, '') || ' ' ||
        coalesce(${vocabularyWords.synonyms}, '') || ' ' ||
        coalesce(${vocabularyWords.notes}, '')
      ) @@ to_tsquery('simple', ${query.tsQuery})
      or exists (
        select 1 from word_meanings
        where word_meanings.word_id = ${vocabularyWords.id}
          and to_tsvector('simple', word_meanings.meaning) @@ to_tsquery('simple', ${query.tsQuery})
      )
      or exists (
        select 1 from word_examples
        where word_examples.word_id = ${vocabularyWords.id}
          and to_tsvector(
            'simple',
            coalesce(word_examples.sentence, '') || ' ' ||
            coalesce(word_examples.meaning, '') || ' ' ||
            coalesce(word_examples.notes, '')
          ) @@ to_tsquery('simple', ${query.tsQuery})
      )
      or exists (
        select 1 from vocabulary_word_tags
        where vocabulary_word_tags.word_id = ${vocabularyWords.id}
          and to_tsvector('simple', vocabulary_word_tags.tag) @@ to_tsquery('simple', ${query.tsQuery})
      )
    )`;
    const score = matchScoreSql({
      title,
      metadata: metadataMatch,
      body: bodyMatch,
      query,
    });

    const rows = await db
      .select({
        id: vocabularyWords.id,
        title: vocabularyWords.word,
        partOfSpeech: vocabularyWords.partOfSpeech,
        notes: vocabularyWords.notes,
        synonyms: vocabularyWords.synonyms,
        meanings: sql<string | null>`(
          select string_agg(word_meanings.meaning, ' · ' order by word_meanings.sort_order, word_meanings.created_at)
          from word_meanings
          where word_meanings.word_id = ${vocabularyWords.id}
        )`,
        tags: sql<string | null>`(
          select string_agg(vocabulary_word_tags.tag, ',')
          from vocabulary_word_tags
          where vocabulary_word_tags.word_id = ${vocabularyWords.id}
        )`,
        exampleHit: sql<string | null>`(
          select word_examples.sentence
          from word_examples
          where word_examples.word_id = ${vocabularyWords.id}
            and (
              word_examples.sentence ilike ${query.like}
              or coalesce(word_examples.meaning, '') ilike ${query.like}
              or coalesce(word_examples.notes, '') ilike ${query.like}
            )
          order by word_examples.sort_order
          limit 1
        )`,
        score,
      })
      .from(vocabularyWords)
      .where(
        and(
          eq(vocabularyWords.userId, scope.userId),
          eq(vocabularyWords.workspaceId, scope.workspaceId),
          sql`(
            ${title} ilike ${query.like}
            or ${metadataMatch}
            or ${bodyMatch}
            or ${ftsMatch}
          )`,
        ),
      )
      .orderBy(desc(score), desc(vocabularyWords.updatedAt))
      .limit(limit);

    return rows.map((row): SearchHit => {
      const posKey = normalizePartOfSpeechKey(row.partOfSpeech);
      const cefr = formatCefrTags(row.tags);

      return {
        type: "vocabulary",
        id: row.id,
        title: row.title,
        subtitle: cefr.join(" · ") || null,
        group: posKey || null,
        groupKind: posKey ? "pos" : null,
        snippetCandidates: [
          row.meanings,
          row.exampleHit,
          row.synonyms,
          ...formatOtherTags(row.tags),
          vocabularyNotesToPlainText(row.notes),
        ],
        href: `/vocabulary/${row.id}`,
        score: Number(row.score) || 0,
      };
    });
  },
};
