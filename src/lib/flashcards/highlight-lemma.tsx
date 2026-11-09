import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Split a sentence and wrap tokens that match the card lemma (case/accent
 * insensitive; leading/trailing punctuation ignored).
 */
export function highlightLemmaInSentence(
  sentence: string,
  lemma: string,
  options?: {
    /** Extra classes for the matched lemma token. */
    matchClassName?: string;
  },
): ReactNode[] {
  const target = lemma.trim();
  if (!target || !sentence) return [sentence];

  const parts = sentence.split(/(\s+)/);
  return parts.map((part, index) => {
    if (/^\s+$/.test(part)) {
      return <span key={`s-${index}`}>{part}</span>;
    }
    if (!isSameWordToken(part, target)) {
      return <span key={`w-${index}`}>{part}</span>;
    }
    return (
      <strong
        key={`w-${index}`}
        className={cn(
          "font-semibold text-ink not-italic",
          options?.matchClassName,
        )}
      >
        {part}
      </strong>
    );
  });
}

export function isSameWordToken(token: string, word: string) {
  const stripped = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (!stripped) return false;
  return (
    stripped.localeCompare(word.trim(), undefined, {
      sensitivity: "accent",
    }) === 0
  );
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "and",
  "or",
  "as",
  "at",
  "by",
  "is",
  "be",
  "are",
]);

/**
 * Highlight the first matching term/phrase inside free text (e.g. an example
 * translation). Supports:
 * - exact phrase match ("look like")
 * - ordered token spans with gaps ("look like" → "look more like")
 * - leading article expansion ("best" → "the best")
 */
export function highlightTermsInText(
  text: string,
  terms: Array<string | null | undefined>,
  options?: {
    matchClassName?: string;
  },
): ReactNode {
  const source = text.trim();
  if (!source) return text;

  const candidates = expandHighlightCandidates(terms);
  if (candidates.length === 0) return text;

  for (const term of candidates) {
    const span = findMatchSpan(source, term);
    if (!span) continue;
    const before = source.slice(0, span.start);
    const match = source.slice(span.start, span.end);
    const after = source.slice(span.end);
    return (
      <>
        {before}
        <strong
          className={cn(
            "font-semibold text-ink not-italic",
            options?.matchClassName,
          )}
        >
          {match}
        </strong>
        {after}
      </>
    );
  }

  return text;
}

function expandHighlightCandidates(terms: Array<string | null | undefined>) {
  const out = new Set<string>();
  for (const raw of terms) {
    const term = raw?.trim() ?? "";
    if (!term) continue;
    out.add(term);
    for (const token of contentTokens(term)) {
      out.add(token);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

function contentTokens(term: string) {
  return term
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((token) => token.length >= 2)
    .filter((token) => !STOPWORDS.has(token.toLocaleLowerCase()));
}

function findMatchSpan(
  source: string,
  term: string,
): { start: number; end: number } | null {
  const lower = source.toLocaleLowerCase();
  const needle = term.toLocaleLowerCase();

  // 1) Contiguous phrase / single token.
  const exactIndex = findWordAwareIndex(lower, needle, 0);
  if (exactIndex >= 0) {
    return expandLeadingDeterminer(source, exactIndex, term.length);
  }

  // 2) Ordered content tokens allowing short gaps ("look like" → "look more like").
  // Drop trailing gloss words if needed ("look like someone" → still match "look like").
  const tokens = contentTokens(term);
  if (tokens.length < 2) return null;

  for (let len = tokens.length; len >= 2; len -= 1) {
    for (let start = 0; start <= tokens.length - len; start += 1) {
      const span = findOrderedTokenSpan(
        lower,
        source,
        tokens.slice(start, start + len),
      );
      if (span) return span;
    }
  }

  return null;
}

function findOrderedTokenSpan(
  lower: string,
  source: string,
  tokens: string[],
): { start: number; end: number } | null {
  let searchFrom = 0;
  let spanStart = -1;
  let spanEnd = -1;
  for (const token of tokens) {
    const idx = findWordAwareIndex(
      lower,
      token.toLocaleLowerCase(),
      searchFrom,
    );
    if (idx < 0) return null;
    if (spanStart < 0) spanStart = idx;
    spanEnd = idx + token.length;
    searchFrom = spanEnd;
  }

  const between = source.slice(spanStart, spanEnd);
  if (between.split(/\s+/).filter(Boolean).length > 6) return null;

  return expandLeadingDeterminer(source, spanStart, spanEnd - spanStart);
}

/** Find `needle` as a whole-word (or whole multi-word) match. */
function findWordAwareIndex(haystack: string, needle: string, from: number) {
  let start = from;
  while (start <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, start);
    if (idx < 0) return -1;
    const beforeOk =
      idx === 0 || /[^\p{L}\p{N}]/u.test(haystack[idx - 1] ?? "");
    const afterIdx = idx + needle.length;
    const afterOk =
      afterIdx >= haystack.length ||
      /[^\p{L}\p{N}]/u.test(haystack[afterIdx] ?? "");
    if (beforeOk && afterOk) return idx;
    start = idx + 1;
  }
  return -1;
}

function expandLeadingDeterminer(
  source: string,
  start: number,
  length: number,
) {
  const end = start + length;
  const before = source.slice(0, start);
  const det = before.match(/(?:^|[^\p{L}\p{N}])((?:the|a|an)\s+)$/iu);
  if (!det?.[1]) return { start, end };
  return { start: start - det[1].length, end };
}
