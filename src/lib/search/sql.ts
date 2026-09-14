import { sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { SEARCH_RANK } from "@/lib/search/ranking";
import type { PreparedQuery } from "@/lib/search/types";

export function matchScoreSql(args: {
  title: SQLWrapper;
  metadata: SQL;
  body: SQL;
  query: PreparedQuery;
}): SQL<number> {
  return sql<number>`greatest(
    case
      when lower(${args.title}) = ${args.query.normalized} then ${SEARCH_RANK.exactTitle}
      when lower(${args.title}) like ${args.query.prefixLike} then ${SEARCH_RANK.prefixTitle}
      when ${args.title} ilike ${args.query.like} then ${SEARCH_RANK.containsTitle}
      else 0
    end,
    case when ${args.metadata} then ${SEARCH_RANK.metadata} else 0 end,
    case when ${args.body} then ${SEARCH_RANK.body} else 0 end
  )`.as("score");
}

export function jsonbFtsMatch(content: SQLWrapper, tsQuery: string) {
  return sql<boolean>`jsonb_to_tsvector(
    'simple',
    coalesce(${content}, '{}'::jsonb),
    '["string"]'::jsonb
  ) @@ to_tsquery('simple', ${tsQuery})`;
}

export function jsonbDocTextAgg(content: SQLWrapper) {
  return sql<string | null>`(
    select string_agg(value #>> '{}', ' ')
    from jsonb_path_query(${content}, '$.**.text') as value
  )`;
}

export function jsonbPromptTextAgg(content: SQLWrapper) {
  return sql<string | null>`(
    select string_agg(value #>> '{}', ' ')
    from jsonb_path_query(${content}, '$.**.prompt') as value
  )`;
}

export function snippetAroundSql(column: SQLWrapper, query: PreparedQuery, maxLength = 140) {
  return sql<string | null>`case
    when ${column} is null or btrim(${column}) = '' then null
    when position(${query.firstToken} in lower(${column})) > 0 then
      substring(
        ${column}
        from greatest(1, position(${query.firstToken} in lower(${column})) - 40)
        for ${maxLength}
      )
    else null
  end`;
}
