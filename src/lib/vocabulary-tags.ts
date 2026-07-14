export type TagGroupKey =
  | "difficulty"
  | "topic"
  | "grammar"
  | "learningStatus";

export type BuiltinTag = {
  id: string;
  group: TagGroupKey;
};

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
    { id: "travel", group: "topic" },
    { id: "work", group: "topic" },
    { id: "school", group: "topic" },
    { id: "business", group: "topic" },
    { id: "technology", group: "topic" },
    { id: "food", group: "topic" },
    { id: "health", group: "topic" },
    { id: "shopping", group: "topic" },
    { id: "family", group: "topic" },
    { id: "nature", group: "topic" },
    { id: "culture", group: "topic" },
    { id: "sports", group: "topic" },
  ],
  grammar: [
    { id: "grammar", group: "grammar" },
    { id: "formal", group: "grammar" },
    { id: "informal", group: "grammar" },
    { id: "slang", group: "grammar" },
    { id: "idiom", group: "grammar" },
    { id: "expression", group: "grammar" },
  ],
  learningStatus: [
    { id: "new", group: "learningStatus" },
    { id: "learning", group: "learningStatus" },
    { id: "review", group: "learningStatus" },
    { id: "mastered", group: "learningStatus" },
  ],
};

export const ALL_BUILTIN_TAGS = Object.values(BUILTIN_TAG_GROUPS).flat();

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
  return ALL_BUILTIN_TAGS.some((item) => item.id === tag);
}

export function getTagGroupForId(tagId: string): TagGroupKey {
  if (BUILTIN_TAG_GROUPS.difficulty.some((tag) => tag.id === tagId)) {
    return "difficulty";
  }
  if (BUILTIN_TAG_GROUPS.topic.some((tag) => tag.id === tagId)) {
    return "topic";
  }
  if (BUILTIN_TAG_GROUPS.grammar.some((tag) => tag.id === tagId)) {
    return "grammar";
  }
  return "learningStatus";
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
