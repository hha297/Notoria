import type { JSONContent } from "@tiptap/react";
import { theoryDocPlainText } from "@/lib/theory/content";
import { buildTheoryLessonBeats } from "@/lib/theory-exercises/lesson-content";

/** Hard cap: example-derived items may be at most this share of the final set. */
export const MAX_EXAMPLE_REUSE_RATIO = 0.2;

/** Soft aim when examples exist; reuse remains optional. */
export const TARGET_EXAMPLE_REUSE_RATIO = 0.1;

export type TheoryGenerationMaterial = {
  /** Rule / explanation text only (examples stripped where detectable). */
  rulesText: string;
  /** Plain-text illustrative examples from the Theory note. */
  exampleTexts: string[];
  /**
   * Content lexemes from examples used to detect reuse
   * (base words / target vocabulary — not affixes or function words).
   */
  exampleLexemes: string[];
};

const FUNCTION_OR_AFFIX = new Set(
  [
    // Common function words across supported UI/study languages (generic filter).
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "with",
    "from",
    "by",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "am",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "he",
    "she",
    "they",
    "we",
    "you",
    "i",
    "me",
    "my",
    "our",
    "your",
    "his",
    "her",
    "their",
    "not",
    "no",
    "yes",
    "ja",
    "tai",
    "mutta",
    "kun",
    "kuin",
    "jos",
    "että",
    "se",
    "ne",
    "hän",
    "he",
    "me",
    "te",
    "minä",
    "sinä",
    "och",
    "eller",
    "men",
    "att",
    "det",
    "den",
    "en",
    "ett",
    "và",
    "hoặc",
    "nhưng",
    "của",
    "là",
    "các",
    "những",
    "một",
    "này",
    "đó",
  ].map((w) => w.toLowerCase()),
);

function normalizeLexeme(value: string): string {
  return value.normalize("NFC").trim().toLowerCase();
}

function letterTokens(text: string): string[] {
  return text.match(/\p{L}[\p{L}\p{M}'’-]*\p{L}|\p{L}/gu) ?? [];
}

/**
 * Extract content lexemes from example strings.
 * Skips tiny tokens, function words, and affix-looking fragments.
 */
export function extractExampleLexemes(exampleTexts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const text of exampleTexts) {
    for (const raw of letterTokens(text)) {
      const token = normalizeLexeme(raw);
      if (token.length < 3) continue;
      if (FUNCTION_OR_AFFIX.has(token)) continue;
      // Affix / ending fragments often start with hyphen in notes.
      if (raw.startsWith("-") || raw.endsWith("-")) continue;
      if (seen.has(token)) continue;
      seen.add(token);
      result.push(token);
    }
  }

  return result;
}

/**
 * Split Theory notes into rules vs illustrative examples without rewriting user content.
 */
export function extractTheoryGenerationMaterial(
  doc: JSONContent,
): TheoryGenerationMaterial {
  const beats = buildTheoryLessonBeats(doc);
  const ruleParts: string[] = [];
  const exampleTexts: string[] = [];

  for (const beat of beats) {
    if (beat.kind === "examples") {
      for (const example of beat.examples) {
        const text = theoryDocPlainText(example).replace(/\s+/g, " ").trim();
        if (text) exampleTexts.push(text);
      }
      continue;
    }
    const text = theoryDocPlainText(beat.doc).replace(/\s+/g, " ").trim();
    if (text) ruleParts.push(text);
    if (beat.title?.trim()) ruleParts.unshift(beat.title.trim());
  }

  // Fallback: if structure detection found nothing, use full plain text as rules.
  const full = theoryDocPlainText(doc).replace(/\s+/g, " ").trim();
  const rulesText = ruleParts.join("\n").trim() || full;

  return {
    rulesText,
    exampleTexts,
    exampleLexemes: extractExampleLexemes(exampleTexts),
  };
}

export function maxExampleReuseAllowed(finalExerciseCount: number): number {
  if (finalExerciseCount <= 0) return 0;
  return Math.floor(finalExerciseCount * MAX_EXAMPLE_REUSE_RATIO);
}

export function targetExampleReuseCount(finalExerciseCount: number): number {
  if (finalExerciseCount <= 0) return 0;
  return Math.floor(finalExerciseCount * TARGET_EXAMPLE_REUSE_RATIO);
}

function lexemeMatchesExample(
  value: string | undefined,
  exampleLexemes: ReadonlySet<string>,
): boolean {
  if (!value?.trim() || exampleLexemes.size === 0) return false;
  const key = normalizeLexeme(value);
  if (exampleLexemes.has(key)) return true;
  // Count reuse only for clear same-lexeme forms (exact or one contains the other
  // as a full stem). Do NOT use short shared prefixes — that false-positives most
  // of a batch and collapses the set to ~20% (a few items).
  for (const lexeme of exampleLexemes) {
    if (key.length < 4 || lexeme.length < 4) continue;
    if (key === lexeme) return true;
    if (key.startsWith(lexeme) || lexeme.startsWith(key)) return true;
  }
  return false;
}

/**
 * True when the exercise reuses an example's target base word or transformation.
 * Shared affixes / function words alone do not count.
 */
export function isExampleDerivedExercise(
  item: {
    type: string;
    sourceWord?: string;
    answer?: string;
    promptWord?: string;
    correctOption?: string;
  },
  exampleLexemes: readonly string[],
): boolean {
  if (exampleLexemes.length === 0) return false;
  const set = new Set(exampleLexemes.map(normalizeLexeme));
  if (item.type === "fill_blank") {
    return (
      lexemeMatchesExample(item.sourceWord, set) ||
      lexemeMatchesExample(item.answer, set)
    );
  }
  if (item.type === "transformation") {
    return (
      lexemeMatchesExample(item.promptWord, set) ||
      lexemeMatchesExample(item.answer, set)
    );
  }
  if (item.type === "multiple_choice") {
    return lexemeMatchesExample(item.correctOption, set);
  }
  return false;
}

/**
 * Prefer fresh AI items; keep at most floor(n × maxRatio) example-derived ones.
 * Applied to the final selected set (after merge / dedupe / validation).
 */
export function enforceExampleReuseLimit<T extends {
  type: string;
  sourceWord?: string;
  answer?: string;
  promptWord?: string;
  correctOption?: string;
}>(
  items: T[],
  exampleLexemes: readonly string[],
  maxItems: number,
): T[] {
  const limit = Math.max(0, maxItems);
  if (limit === 0 || items.length === 0) return [];
  if (exampleLexemes.length === 0) return items.slice(0, limit);

  // Cap reuse against the *target* set size, not a temporary oversized pool.
  // Splitting before slice(maxItems) preserves fresh items that would otherwise
  // be dropped when the early slice was almost all false-positive "reused".
  const allowed = maxExampleReuseAllowed(limit);
  const fresh: T[] = [];
  const reused: T[] = [];

  for (const item of items) {
    if (isExampleDerivedExercise(item, exampleLexemes)) reused.push(item);
    else fresh.push(item);
  }

  return [...fresh, ...reused.slice(0, allowed)].slice(0, limit);
}
