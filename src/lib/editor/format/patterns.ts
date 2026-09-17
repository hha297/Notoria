/**
 * Extensible pattern registries for the rule-based formatter.
 * Keep these language-neutral. Do not special-case individual documents
 * or bake language-specific grammar terms into detector control flow.
 */

import { WORKPLACE_LANGUAGES } from "@/lib/languages";

export type SectionPattern = {
  id: string;
  /** Heading level when this line is used as a section title. */
  level: 1 | 2 | 3;
  match: RegExp;
};

const languageTargetAlternation = WORKPLACE_LANGUAGES.map((language) =>
  language.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

/** Dictionary titles such as "widget in English". */
export const TITLE_PATTERNS: readonly SectionPattern[] = [
  {
    id: "language-target",
    level: 1,
    match: new RegExp(`^.+\\s+in\\s+(${languageTargetAlternation})$`, "iu"),
  },
];

export const SECTION_PATTERNS: readonly SectionPattern[] = [
  {
    id: "inflection",
    level: 2,
    match: /^(inflection|declension|conjugation|paradigm)$/iu,
  },
  {
    id: "definitions",
    level: 2,
    match:
      /^(definitions|meanings|usage|examples|synonyms|etymology)$/iu,
  },
  {
    id: "pos-group",
    level: 2,
    match: /^(nouns|adjectives|verbs|adverbs|pronouns)$/iu,
  },
  {
    id: "pos-item",
    level: 3,
    match: /^(noun|adjective|verb|adverb|pronoun)$/iu,
  },
];

export const EMPHASIS_LABELS = [
  "term",
  "definition",
  "example",
  "note",
  "meaning",
  "translation",
  "usage",
] as const;

export const BULLET_MARKER_RE = /^([-*+•●◦.]|\u2022|\u00B7)\s+(.*)$/u;
export const ORDERED_MARKER_RE = /^(\d+)[.)]\s+(.+)$/u;
export const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.+)$/u;
export const MARKDOWN_TABLE_RULE_RE =
  /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*$/;

export function matchSectionPattern(
  text: string,
  patterns: readonly SectionPattern[],
): SectionPattern | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return patterns.find((pattern) => pattern.match.test(trimmed)) ?? null;
}
