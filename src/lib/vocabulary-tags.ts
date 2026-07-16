export type TagGroupKey = "difficulty" | "topic" | "grammar";

export type BuiltinTag = {
  id: string;
  group: TagGroupKey;
};

/** Tags shown in the picker — kept short and everyday-friendly. */
export const BUILTIN_TAG_GROUPS: Record<TagGroupKey, BuiltinTag[]> = {
  difficulty: [
    { id: "a1", group: "difficulty" },
    { id: "a2", group: "difficulty" },
    { id: "b1", group: "difficulty" },
    { id: "b2", group: "difficulty" },
    { id: "c1", group: "difficulty" },
    { id: "c2", group: "difficulty" },
  ],
  topic: [
    { id: "daily", group: "topic" },
    { id: "home", group: "topic" },
    { id: "food", group: "topic" },
    { id: "travel", group: "topic" },
    { id: "work", group: "topic" },
    { id: "people", group: "topic" },
    { id: "feelings", group: "topic" },
    { id: "culture", group: "topic" },
  ],
  grammar: [
    { id: "formal", group: "grammar" },
    { id: "informal", group: "grammar" },
    { id: "slang", group: "grammar" },
    { id: "idiom", group: "grammar" },
  ],
};

/** Older tag ids that may still exist on saved words. */
const LEGACY_TAG_GROUPS: Record<string, TagGroupKey | "learningStatus"> = {
  school: "topic",
  business: "topic",
  technology: "topic",
  health: "topic",
  shopping: "topic",
  family: "topic",
  nature: "topic",
  sports: "topic",
  grammar: "grammar",
  expression: "grammar",
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

export function customTagKey(name: string): string {
  return `${CUSTOM_TAG_PREFIX}${name.trim()}`;
}

export function isCustomTagKey(tag: string): boolean {
  return tag.startsWith(CUSTOM_TAG_PREFIX);
}

export function getCustomTagName(tag: string): string {
  return tag.slice(CUSTOM_TAG_PREFIX.length);
}

export function isBuiltinTag(tag: string): boolean {
  return (
    ALL_BUILTIN_TAGS.some((item) => item.id === tag) || tag in LEGACY_TAG_GROUPS
  );
}

export function getTagGroupForId(tagId: string): TagGroupKey | "learningStatus" {
  if (BUILTIN_TAG_GROUPS.difficulty.some((tag) => tag.id === tagId)) {
    return "difficulty";
  }
  if (BUILTIN_TAG_GROUPS.topic.some((tag) => tag.id === tagId)) {
    return "topic";
  }
  if (BUILTIN_TAG_GROUPS.grammar.some((tag) => tag.id === tagId)) {
    return "grammar";
  }
  return LEGACY_TAG_GROUPS[tagId] ?? "topic";
}

export function getTagLabel(
  tag: string,
  translate: (key: string) => string,
): string {
  if (isCustomTagKey(tag)) {
    return getCustomTagName(tag);
  }

  const group = getTagGroupForId(tag);
  return translate(`${group}.${tag}`);
}
