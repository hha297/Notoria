import {
  canonicalizeTopicId,
  DEFAULT_TOPIC_ID,
  TOPIC_IDS,
  type TopicId,
} from "@/lib/taxonomy/topics";

export const WRITING_CEFR_LEVELS = [
  "a1",
  "a2",
  "b1",
  "b2",
  "c1",
  "c2",
] as const;

/** Same stable topic IDs as vocabulary — labels via `tags.topic.*`. */
export const WRITING_TOPICS = TOPIC_IDS;

export { DEFAULT_TOPIC_ID };

export const WRITING_FORMALITY = ["formal", "informal", "neutral"] as const;

export type WritingCefr = (typeof WRITING_CEFR_LEVELS)[number];
export type WritingTopic = TopicId;
export type WritingFormality = (typeof WRITING_FORMALITY)[number];

/**
 * Categorization for a writing item. Extra keys are preserved so later
 * metadata can be added without a schema migration.
 *
 * Dates (`createdAt` / `updatedAt`) live on the writing row in the DB.
 */
export type WritingKind = "learning_note" | "free";

export type WritingMeta = {
  cefrLevel?: WritingCefr | null;
  topic?: string | null;
  formality?: WritingFormality | null;
  /** Optional document purpose — learning notes vs free writing practice. */
  kind?: WritingKind | null;
  [key: string]: unknown;
};

export const EMPTY_WRITING_META: WritingMeta = {
  cefrLevel: null,
  topic: null,
  formality: null,
  kind: null,
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

function asKind(value: unknown): WritingKind | null {
  return value === "learning_note" || value === "free" ? value : null;
}

function asTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return canonicalizeTopicId(trimmed) ?? trimmed;
}

export function parseWritingMeta(raw: unknown): WritingMeta {
  if (!isRecord(raw)) {
    return { ...EMPTY_WRITING_META };
  }

  const { cefrLevel, cefr, topic, formality, kind, ...rest } = raw;

  return {
    ...rest,
    // Accept legacy `cefr` key from earlier drafts.
    cefrLevel: asCefr(cefrLevel ?? cefr),
    topic: asTopic(topic),
    formality: asFormality(formality),
    kind: asKind(kind),
  };
}

export function serializeWritingMeta(meta: WritingMeta): WritingMeta {
  const {
    cefrLevel,
    cefr: _legacyCefr,
    topic,
    formality,
    kind,
    ...rest
  } = meta;
  return {
    ...rest,
    cefrLevel: asCefr(cefrLevel),
    topic: asTopic(topic),
    formality: asFormality(formality),
    kind: asKind(kind),
  };
}

export function writingMetaSearchText(meta: WritingMeta): string {
  return [meta.cefrLevel, meta.topic, meta.formality, meta.kind]
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
