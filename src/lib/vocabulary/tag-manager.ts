import {
  BUILTIN_TAG_GROUPS,
  type TagGroupKey,
  canonicalizeTagId,
} from "@/lib/vocabulary-tags";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

/** Tag Manager only edits Aihe (topic) and Käyttö (usage) membership. */
export type TagManagerGroup = Extract<TagGroupKey, "topic" | "grammar">;

export const TAG_MANAGER_GROUPS: TagManagerGroup[] = ["topic", "grammar"];

export function tagManagerTagIds(group: TagManagerGroup): string[] {
  return BUILTIN_TAG_GROUPS[group].map((tag) => tag.id);
}

export function isTagManagerTagId(tagId: string): boolean {
  return TAG_MANAGER_GROUPS.some((group) =>
    BUILTIN_TAG_GROUPS[group].some((tag) => tag.id === tagId),
  );
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

export function wordHasTag(
  word: Pick<VocabularyWordRow, "tags">,
  tagId: string,
): boolean {
  return word.tags.some((item) => item.tag === tagId);
}

/** True when a DB-stored tag value belongs to the Tag Manager tag (incl. legacy aliases). */
export function storedTagMatchesManagerTag(
  storedTag: string,
  tagId: string,
): boolean {
  return canonicalizeTagId(storedTag) === tagId;
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
    /** Kept for call-site clarity; membership is shown via styling, not filtering. */
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
