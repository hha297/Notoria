import type { PreparedQuery } from "@/lib/search/types";

const MAX_QUERY_LENGTH = 80;
const MAX_TOKENS = 8;

/** Split on anything that is not a letter or number, including Finnish letters. */
const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u;

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "").trim();
}

export function tokenizeSearchQuery(raw: string): string[] {
  const clipped = raw.trim().slice(0, MAX_QUERY_LENGTH);
  if (!clipped) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const part of clipped.split(TOKEN_SPLIT)) {
    const token = part.toLocaleLowerCase();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= MAX_TOKENS) break;
  }

  return tokens;
}

/**
 * Build a prefix `simple` tsquery (`kompar:*`) so partial tokens match
 * `komparatiivi` without downloading rows into the app.
 */
export function toPrefixTsQuery(tokens: string[]): string {
  return tokens
    .map((token) => token.replace(/['\\]/g, ""))
    .filter((token) => token.length > 0)
    .map((token) => `${token}:*`)
    .join(" & ");
}

export function prepareSearchQuery(raw: string): PreparedQuery | null {
  const trimmed = raw.trim().slice(0, MAX_QUERY_LENGTH);
  const tokens = tokenizeSearchQuery(trimmed);
  if (tokens.length === 0) return null;

  const normalized = escapeLikePattern(trimmed.toLocaleLowerCase());
  if (!normalized) return null;

  const tsQuery = toPrefixTsQuery(tokens);
  if (!tsQuery) return null;

  return {
    raw: trimmed,
    normalized,
    firstToken: tokens[0] ?? normalized,
    like: `%${normalized}%`,
    prefixLike: `${normalized}%`,
    tsQuery,
  };
}
