/**
 * Meaning-level usage labels (register/style for one sense).
 * Separate from word-level tags and part of speech.
 *
 * Reuses stable IDs from word-level USAGE_IDS where concepts overlap
 * (formal, informal, spoken/colloquial, slang, idiom). Adds meaning-only
 * identifiers for literary, technical, archaic, regional, figurative.
 *
 * Display labels live in i18n (`tags.grammar.*` for shared ids,
 * `tags.meaningUsage.*` for meaning-only ids). Store only these IDs.
 */

import {
  canonicalizeUsageId,
  USAGE_IDS,
  type UsageId,
} from "@/lib/taxonomy/topics";

/** Shared with word-level usage tags. */
export const SHARED_MEANING_USAGE_IDS = [
  "formal",
  "informal",
  "spoken",
  "slang",
  "idiom",
] as const satisfies readonly UsageId[];

/** Meaning-only — not offered as word-level tags. */
export const MEANING_ONLY_USAGE_IDS = [
  "literary",
  "technical",
  "archaic",
  "regional",
  "figurative",
] as const;

export const MEANING_USAGE_IDS = [
  ...SHARED_MEANING_USAGE_IDS,
  ...MEANING_ONLY_USAGE_IDS,
] as const;

export type MeaningUsageId = (typeof MEANING_USAGE_IDS)[number];
export type MeaningOnlyUsageId = (typeof MEANING_ONLY_USAGE_IDS)[number];

const MEANING_USAGE_SET = new Set<string>(MEANING_USAGE_IDS);
const MEANING_ONLY_SET = new Set<string>(MEANING_ONLY_USAGE_IDS);

/**
 * Aliases → canonical meaning usage id.
 * Includes colloquial→spoken and idiomatic→idiom.
 */
export const MEANING_USAGE_ALIASES: Record<string, MeaningUsageId> = {
  formal: "formal",
  informal: "informal",
  spoken: "spoken",
  colloquial: "spoken",
  "spoken / colloquial": "spoken",
  slang: "slang",
  idiom: "idiom",
  idiomatic: "idiom",
  literary: "literary",
  technical: "technical",
  archaic: "archaic",
  regional: "regional",
  figurative: "figurative",
  // fi
  muodollinen: "formal",
  epämuodollinen: "informal",
  puhekieli: "spoken",
  slangi: "slang",
  idiomi: "idiom",
  kirjallinen: "literary",
  tekninen: "technical",
  vanhentunut: "archaic",
  alueellinen: "regional",
  kuvaannollinen: "figurative",
  // sv
  formell: "formal",
  informell: "informal",
  talspråk: "spoken",
  litterär: "literary",
  teknisk: "technical",
  ålderdomlig: "archaic",
  regionalt: "regional",
  bildligt: "figurative",
  // vi
  "trang trọng": "formal",
  "thân mật": "informal",
  "văn nói": "spoken",
  "tiếng lóng": "slang",
  "thành ngữ": "idiom",
  "văn chương": "literary",
  "kỹ thuật": "technical",
  "cổ": "archaic",
  "địa phương": "regional",
  "nghĩa bóng": "figurative",
};

export function isMeaningUsageId(value: string): value is MeaningUsageId {
  return MEANING_USAGE_SET.has(value);
}

export function isMeaningOnlyUsageId(
  value: string,
): value is MeaningOnlyUsageId {
  return MEANING_ONLY_SET.has(value);
}

/** Resolve raw AI/import/display value to a supported meaning usage id. */
export function canonicalizeMeaningUsageId(
  raw: string,
): MeaningUsageId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isMeaningUsageId(trimmed)) return trimmed;

  const alias = MEANING_USAGE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  // Reuse word-level usage canonicalization for shared ids (e.g. academic skipped).
  const usage = canonicalizeUsageId(trimmed);
  if (usage && isMeaningUsageId(usage)) return usage;

  return null;
}

/** Validate, de-dupe, and drop unknown labels. Empty = unspecified usage. */
export function normalizeMeaningUsageLabels(
  labels: readonly string[] | null | undefined,
): MeaningUsageId[] {
  if (!labels?.length) return [];
  const seen = new Set<MeaningUsageId>();
  const result: MeaningUsageId[] = [];
  for (const raw of labels) {
    if (typeof raw !== "string") continue;
    const id = canonicalizeMeaningUsageId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  // Stable order matching MEANING_USAGE_IDS picker order
  return MEANING_USAGE_IDS.filter((id) => seen.has(id));
}

/**
 * next-intl key under `tags` for a meaning usage id.
 * Shared ids use `grammar.*`; meaning-only use `meaningUsage.*`.
 */
export function meaningUsageMessageKey(
  id: MeaningUsageId,
): `grammar.${MeaningUsageId}` | `meaningUsage.${MeaningOnlyUsageId}` {
  if (isMeaningOnlyUsageId(id)) {
    return `meaningUsage.${id}`;
  }
  return `grammar.${id}`;
}

export function resolveMeaningUsageLabel(
  id: string,
  translate: (key: string) => string,
): string {
  const canonical = canonicalizeMeaningUsageId(id);
  if (!canonical) return id.trim();
  return translate(meaningUsageMessageKey(canonical));
}

/** Ensure word-level USAGE_IDS still lists shared ids (sanity for reuse). */
export function sharedUsageIdsOverlapWordTags(): boolean {
  return SHARED_MEANING_USAGE_IDS.every((id) =>
    (USAGE_IDS as readonly string[]).includes(id),
  );
}
