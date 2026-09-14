/**
 * Extensible pattern registries for the rule-based formatter.
 * Add new dictionary/section/case patterns here — do not special-case
 * individual pasted documents in detector control flow.
 */

export type SectionPattern = {
  id: string;
  /** Heading level when this line is used as a section title. */
  level: 1 | 2 | 3;
  match: RegExp;
};

/** Language-target titles such as "elämäntapa englanniksi". */
export const TITLE_PATTERNS: readonly SectionPattern[] = [
  {
    id: "language-target",
    level: 1,
    match:
      /^.+\s+(englanniksi|suomeksi|in english|in finnish|in vietnamese|tiếng việt)$/iu,
  },
];

export const SECTION_PATTERNS: readonly SectionPattern[] = [
  {
    id: "inflection",
    level: 2,
    match:
      /^(taivutusmuodot|taivutuskaava|taivutus|paradigma|inflection|declension|conjugation)$/iu,
  },
  {
    id: "definitions",
    level: 2,
    match:
      /^(määritelmät|merkitykset|definitions|meanings|käyttö|usage|esimerkit|examples|synonyymit|synonyms|etymologia|etymology)$/iu,
  },
  {
    id: "pos-group",
    level: 2,
    match:
      /^(substantiivit|adjektiivit|verbit|adverbit|pronominit|nouns|adjectives|verbs|adverbs|pronouns)$/iu,
  },
  {
    id: "pos-item",
    level: 3,
    match:
      /^(substantiivi|adjektiivi|verbi|adverbi|pronomini|noun|adjective|verb|adverb|pronoun)$/iu,
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
  "huom",
  "huomautus",
  "esimerkki",
  "määritelmä",
  "käyttö",
] as const;

/** Canonical Finnish noun-case order for inflection tables. */
export const FINNISH_CASES = [
  "nominatiivi",
  "genetiivi",
  "partitiivi",
  "akkusatiivi",
  "inessiivi",
  "elatiivi",
  "illatiivi",
  "adessiivi",
  "ablatiivi",
  "allatiivi",
  "essiivi",
  "translatiivi",
  "instruktiivi",
  "abessiivi",
  "komitatiivi",
] as const;

export type FinnishCase = (typeof FINNISH_CASES)[number];

export const INFLECTION_TABLE_HEADERS = ["Sija", "Yksikkö", "Monikko"] as const;

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

export function displayCaseName(value: FinnishCase): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
