import { SNIPPET_MAX_LENGTH } from "@/lib/search/types";
import { tokenizeSearchQuery } from "@/lib/search/query";

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function firstNeedle(text: string, query: string): string | null {
  const lower = text.toLocaleLowerCase();
  const direct = query.trim().toLocaleLowerCase();
  if (direct && lower.includes(direct)) return direct;

  for (const token of tokenizeSearchQuery(query)) {
    if (lower.includes(token)) return token;
  }
  return null;
}

export function excerptAround(
  text: string,
  query: string,
  maxLength = SNIPPET_MAX_LENGTH,
): string {
  const compact = collapseWhitespace(text);
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;

  const needle = firstNeedle(compact, query);
  if (!needle) {
    return `${compact.slice(0, maxLength).trimEnd()}…`;
  }

  const index = compact.toLocaleLowerCase().indexOf(needle);
  if (index < 0) {
    return `${compact.slice(0, maxLength).trimEnd()}…`;
  }

  const padding = Math.max(0, Math.floor((maxLength - needle.length) / 2));
  const start = Math.max(0, index - padding);
  const end = Math.min(compact.length, start + maxLength);
  const sliceStart = end - start < maxLength ? Math.max(0, end - maxLength) : start;
  const excerpt = compact.slice(sliceStart, end).trim();
  const prefix = sliceStart > 0 ? "…" : "";
  const suffix = end < compact.length ? "…" : "";
  return `${prefix}${excerpt}${suffix}`;
}

export function pickSnippet(
  query: string,
  title: string,
  candidates: Array<string | null | undefined>,
): string | null {
  const normalizedTitle = collapseWhitespace(title).toLocaleLowerCase();
  const cleaned = candidates
    .map((value) => (value ? collapseWhitespace(value) : ""))
    .filter((value) => value.length > 0 && value.toLocaleLowerCase() !== normalizedTitle);

  const matching = cleaned.find((value) => firstNeedle(value, query));
  const chosen = matching ?? cleaned[0];
  if (!chosen) return null;
  return excerptAround(chosen, query);
}

export type HighlightPart = {
  text: string;
  match: boolean;
};

export function splitHighlight(text: string, query: string): HighlightPart[] {
  const needle = firstNeedle(text, query);
  if (!needle) return [{ text, match: false }];

  const parts: HighlightPart[] = [];
  const lower = text.toLocaleLowerCase();
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(needle, cursor);
    if (index < 0) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), match: false });
    }
    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }

  return parts.filter((part) => part.text.length > 0);
}
