import {
  canonicalizeTopicId,
  canonicalizeUsageId,
  isKnownTopicId,
  isKnownUsageId,
  LEGACY_USAGE_IDS,
  TOPIC_IDS,
  USAGE_IDS,
  type TopicId,
  type UsageId,
} from "@/lib/taxonomy/topics";

export type TagGroupKey = "difficulty" | "topic" | "grammar";

export type BuiltinTag = {
  id: string;
  group: TagGroupKey;
};

/** Tags shown in the picker — shared taxonomy ids only. */
export const BUILTIN_TAG_GROUPS: Record<TagGroupKey, BuiltinTag[]> = {
  difficulty: [
    { id: "a1", group: "difficulty" },
    { id: "a2", group: "difficulty" },
    { id: "b1", group: "difficulty" },
    { id: "b2", group: "difficulty" },
    { id: "c1", group: "difficulty" },
    { id: "c2", group: "difficulty" },
  ],
  topic: TOPIC_IDS.map((id) => ({ id, group: "topic" as const })),
  grammar: USAGE_IDS.map((id) => ({ id, group: "grammar" as const })),
};

/** Older tag ids that may still exist on saved words (usage / learning status). */
const LEGACY_TAG_GROUPS: Record<string, TagGroupKey | "learningStatus"> = {
  ...Object.fromEntries(
    LEGACY_USAGE_IDS.map((id) => [id, "grammar" as const]),
  ),
  new: "learningStatus",
  learning: "learningStatus",
  review: "learningStatus",
  mastered: "learningStatus",
};

export const ALL_BUILTIN_TAGS = Object.values(BUILTIN_TAG_GROUPS).flat();

export const TAG_PICKER_GROUPS: TagGroupKey[] = [
  "difficulty",
  "topic",
  "grammar",
];

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "article",
  "determiner",
] as const;

const CUSTOM_TAG_PREFIX = "custom:";
export const CUSTOM_TAG_MAX_LENGTH = 40;

const DIFFICULTY_IDS = new Set(
  BUILTIN_TAG_GROUPS.difficulty.map((tag) => tag.id),
);
const LEARNING_STATUS_IDS = new Set([
  "new",
  "learning",
  "review",
  "mastered",
]);

export function customTagKey(name: string): string {
  return `${CUSTOM_TAG_PREFIX}${name.trim()}`;
}

export function isCustomTagKey(tag: string): boolean {
  return tag.startsWith(CUSTOM_TAG_PREFIX);
}

export function getCustomTagName(tag: string): string {
  return tag.slice(CUSTOM_TAG_PREFIX.length);
}

export function uniqueCustomTagNames(names: string[]): string[] {
  const seen = new Map<string, string>();

  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, name);
    }
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function findCustomTagName(
  names: string[],
  candidate: string,
): string | undefined {
  const key = candidate.trim().toLowerCase();
  if (!key) return undefined;
  return names.find((name) => name.toLowerCase() === key);
}

export function isValidCustomTagName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= CUSTOM_TAG_MAX_LENGTH;
}

export type VocabularyTagGroup = TagGroupKey | "custom";

export type VocabularyTagOption = {
  id: string;
  group: VocabularyTagGroup;
};

export function listBuiltinTagOptions(): VocabularyTagOption[] {
  return TAG_PICKER_GROUPS.flatMap((group) =>
    BUILTIN_TAG_GROUPS[group].map((tag) => ({ id: tag.id, group })),
  );
}

export function listCustomTagOptions(names: string[]): VocabularyTagOption[] {
  return uniqueCustomTagNames(names).map((name) => ({
    id: customTagKey(name),
    group: "custom" as const,
  }));
}

export function listTagOptions(customNames: string[]): VocabularyTagOption[] {
  return [...listBuiltinTagOptions(), ...listCustomTagOptions(customNames)];
}

/**
 * Map a raw stored tag to a language-independent builtin id when possible.
 * Custom tags pass through unchanged (after trim).
 */
export function canonicalizeTagId(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isCustomTagKey(trimmed)) {
    const name = getCustomTagName(trimmed).trim();
    return isValidCustomTagName(name) ? customTagKey(name) : null;
  }

  if (DIFFICULTY_IDS.has(trimmed) || LEARNING_STATUS_IDS.has(trimmed)) {
    return trimmed;
  }

  const topic = canonicalizeTopicId(trimmed);
  if (topic) return topic;

  const usage = canonicalizeUsageId(trimmed);
  if (usage) return usage;

  return null;
}

/** Canonicalize and de-dupe tags stored on a word. */
export function normalizeWordTags(
  tags: string[],
  customNames: string[] = [],
): string[] {
  const canonicalCustom = uniqueCustomTagNames(customNames);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    let tag = canonicalizeTagId(raw);
    if (!tag) continue;

    if (isCustomTagKey(tag)) {
      const name = getCustomTagName(tag).trim();
      if (!isValidCustomTagName(name)) continue;
      tag = customTagKey(findCustomTagName(canonicalCustom, name) ?? name);
    } else if (!isBuiltinTag(tag)) {
      continue;
    }

    const dedupeKey = isCustomTagKey(tag) ? tag.toLowerCase() : tag;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(tag);
  }

  return result;
}

export function isBuiltinTag(tag: string): boolean {
  return (
    ALL_BUILTIN_TAGS.some((item) => item.id === tag) || tag in LEGACY_TAG_GROUPS
  );
}

export function getTagGroupForId(tagId: string): TagGroupKey | "learningStatus" {
  if (DIFFICULTY_IDS.has(tagId)) return "difficulty";
  if (isKnownTopicId(tagId) || canonicalizeTopicId(tagId)) return "topic";
  if (isKnownUsageId(tagId)) return "grammar";
  if (LEARNING_STATUS_IDS.has(tagId)) return "learningStatus";
  return LEGACY_TAG_GROUPS[tagId] ?? "topic";
}

export function getTagLabel(
  tag: string,
  translate: (key: string) => string,
): string {
  if (isCustomTagKey(tag)) {
    return getCustomTagName(tag);
  }

  const canonical = canonicalizeTagId(tag) ?? tag;
  const group = getTagGroupForId(canonical);
  return translate(`${group}.${canonical}`);
}

export type { TopicId, UsageId };
