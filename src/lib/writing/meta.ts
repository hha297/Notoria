export const WRITING_CEFR_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
] as const;

export const WRITING_TOPICS = [
  "travel",
  "work",
  "daily",
  "food",
  "shopping",
  "home",
  "people",
  "culture",
] as const;

export const WRITING_FORMALITY = ["formal", "informal", "neutral"] as const;

export type WritingCefr = (typeof WRITING_CEFR_LEVELS)[number];
export type WritingTopic = (typeof WRITING_TOPICS)[number];
export type WritingFormality = (typeof WRITING_FORMALITY)[number];

/**
 * Categorization for a writing item. Extra keys are preserved so later
 * metadata can be added without a schema migration.
 *
 * Dates (`createdAt` / `updatedAt`) live on the writing row in the DB.
 */
export type WritingMeta = {
  cefrLevel?: WritingCefr | null;
  topic?: string | null;
  formality?: WritingFormality | null;
  [key: string]: unknown;
};

export const EMPTY_WRITING_META: WritingMeta = {
  cefrLevel: null,
  topic: null,
  formality: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asCefr(value: unknown): WritingCefr | null {
  return typeof value === "string" &&
    (WRITING_CEFR_LEVELS as readonly string[]).includes(value)
    ? (value as WritingCefr)
    : null;
}

function asFormality(value: unknown): WritingFormality | null {
  return typeof value === "string" &&
    (WRITING_FORMALITY as readonly string[]).includes(value)
    ? (value as WritingFormality)
    : null;
}

function asTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseWritingMeta(raw: unknown): WritingMeta {
  if (!isRecord(raw)) {
    return { ...EMPTY_WRITING_META };
  }

  const { cefrLevel, cefr, topic, formality, ...rest } = raw;

  return {
    ...rest,
    // Accept legacy `cefr` key from earlier drafts.
    cefrLevel: asCefr(cefrLevel ?? cefr),
    topic: asTopic(topic),
    formality: asFormality(formality),
  };
}

export function serializeWritingMeta(meta: WritingMeta): WritingMeta {
  const { cefrLevel, cefr: _legacyCefr, topic, formality, ...rest } = meta;
  return {
    ...rest,
    cefrLevel: asCefr(cefrLevel),
    topic: asTopic(topic),
    formality: asFormality(formality),
  };
}

export function writingMetaSearchText(meta: WritingMeta): string {
  return [meta.cefrLevel, meta.topic, meta.formality]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    )
    .join(" ")
    .toLowerCase();
}

export function isKnownWritingTopic(
  topic: string | null | undefined,
): topic is WritingTopic {
  return (
    typeof topic === "string" &&
    (WRITING_TOPICS as readonly string[]).includes(topic)
  );
}
