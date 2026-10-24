import {
  BUILTIN_TAG_GROUPS,
  type TagGroupKey,
  canonicalizeTagId,
  getCustomTagName,
  isCustomTagKey,
  isValidCustomTagName,
  listCustomTagOptions,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

/** Built-in groups editable in Tag Manager (not difficulty / POS). */
export type TagManagerGroup = Extract<TagGroupKey, "topic" | "grammar">;

export const TAG_MANAGER_GROUPS: TagManagerGroup[] = ["topic", "grammar"];

export type TagManagerKind = "standard" | "custom";

export function tagManagerTagIds(group: TagManagerGroup): string[] {
  return BUILTIN_TAG_GROUPS[group].map((tag) => tag.id);
}

/** Standard topic/usage ids, or workspace custom tags (`custom:…`). */
export function isTagManagerTagId(tagId: string): boolean {
  if (isCustomTagKey(tagId)) {
    return isValidCustomTagName(getCustomTagName(tagId));
  }
  return TAG_MANAGER_GROUPS.some((group) =>
    BUILTIN_TAG_GROUPS[group].some((tag) => tag.id === tagId),
  );
}

export function tagManagerKindForId(tagId: string): TagManagerKind | null {
  if (!isTagManagerTagId(tagId)) return null;
  return isCustomTagKey(tagId) ? "custom" : "standard";
}

export function tagManagerGroupForId(
  tagId: string,
): TagManagerGroup | null {
  for (const group of TAG_MANAGER_GROUPS) {
    if (BUILTIN_TAG_GROUPS[group].some((tag) => tag.id === tagId)) {
      return group;
    }
  }
  return null;
}

/**
 * Custom tag ids for the manager: workspace registry + any still on words.
 * Uses the data model (`custom:` prefix), never hardcoded names.
 */
export function listTagManagerCustomTagIds(
  customNames: string[],
  words: Array<Pick<VocabularyWordRow, "tags">> = [],
): string[] {
  const fromWords: string[] = [];
  for (const word of words) {
    for (const entry of word.tags) {
      if (!isCustomTagKey(entry.tag)) continue;
      const canonical = canonicalizeTagId(entry.tag);
      if (!canonical || !isCustomTagKey(canonical)) continue;
      fromWords.push(getCustomTagName(canonical));
    }
  }
  return listCustomTagOptions(
    uniqueCustomTagNames([...customNames, ...fromWords]),
  ).map((option) => option.id);
}

/** True when a DB-stored tag value belongs to the Tag Manager tag (incl. legacy aliases). */
export function storedTagMatchesManagerTag(
  storedTag: string,
  tagId: string,
): boolean {
  const stored = canonicalizeTagId(storedTag);
  const target = canonicalizeTagId(tagId) ?? tagId.trim();
  if (!stored || !target) return false;
  if (isCustomTagKey(stored) && isCustomTagKey(target)) {
    return stored.toLowerCase() === target.toLowerCase();
  }
  return stored === target;
}

export function wordHasTag(
  word: Pick<VocabularyWordRow, "tags">,
  tagId: string,
): boolean {
  return word.tags.some((item) => storedTagMatchesManagerTag(item.tag, tagId));
}

export function countWordsWithTag(
  words: Array<Pick<VocabularyWordRow, "tags">>,
  tagId: string,
): number {
  return words.reduce(
    (count, word) => count + (wordHasTag(word, tagId) ? 1 : 0),
    0,
  );
}

export function filterWordsForTagManager(
  words: VocabularyWordRow[],
  options: {
    /** Kept for call-site clarity; membership is shown via sections, not filtering. */
    tagId: string;
    search: string;
  },
): VocabularyWordRow[] {
  void options.tagId;
  const query = options.search.trim().toLowerCase();
  if (!query) return words;

  return words.filter((word) => {
    if (word.word.toLowerCase().includes(query)) return true;
    return word.meanings.some((meaning) =>
      meaning.meaning.toLowerCase().includes(query),
    );
  });
}

/** Split filtered words into assigned vs other for the selected tag (no overlap). */
export function partitionWordsByTagMembership(
  words: VocabularyWordRow[],
  tagId: string,
): { assigned: VocabularyWordRow[]; other: VocabularyWordRow[] } {
  const assigned: VocabularyWordRow[] = [];
  const other: VocabularyWordRow[] = [];
  for (const word of words) {
    if (wordHasTag(word, tagId)) assigned.push(word);
    else other.push(word);
  }
  return { assigned, other };
}

export type TagManagerOperation = "add" | "remove";

/**
 * Infer Add vs Remove from the first selected word's membership.
 * Empty selection → unlocked (any word may be selected next).
 */
export function selectionOperationForTag(
  words: Array<Pick<VocabularyWordRow, "id" | "tags">>,
  selectedWordIds: Iterable<string>,
  tagId: string,
): TagManagerOperation | null {
  const selected = new Set(selectedWordIds);
  for (const word of words) {
    if (!selected.has(word.id)) continue;
    return wordHasTag(word, tagId) ? "remove" : "add";
  }
  return null;
}

/** Whether a word can be selected given the lock from the first pick. */
export function isWordSelectableForTagOperation(
  word: Pick<VocabularyWordRow, "tags">,
  tagId: string,
  operation: TagManagerOperation | null,
): boolean {
  if (operation === null) return true;
  const member = wordHasTag(word, tagId);
  return operation === "add" ? !member : member;
}

/** Split selected words into those that can be added vs removed for the current tag. */
export function partitionSelectedForTag(
  words: Array<Pick<VocabularyWordRow, "id" | "tags">>,
  selectedWordIds: Iterable<string>,
  tagId: string,
): { toAdd: string[]; toRemove: string[] } {
  const selected = new Set(selectedWordIds);
  const toAdd: string[] = [];
  const toRemove: string[] = [];

  for (const word of words) {
    if (!selected.has(word.id)) continue;
    if (wordHasTag(word, tagId)) {
      toRemove.push(word.id);
    } else {
      toAdd.push(word.id);
    }
  }

  return { toAdd, toRemove };
}

/** All standard (topic + usage) ids editable in Tag Manager. */
export function allStandardTagManagerIds(): string[] {
  return TAG_MANAGER_GROUPS.flatMap((group) => tagManagerTagIds(group));
}

/** Prefer a stable default selection among standard tags. */
export function defaultTagManagerTagId(
  group: TagManagerGroup = "topic",
): string {
  return tagManagerTagIds(group)[0] ?? "everyday_life";
}
