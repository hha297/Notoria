import type { MultiFilterValue } from "@/lib/filters/multi-select";
import { matchesMultiFilter, matchesMultiFilterAny } from "@/lib/filters/multi-select";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import type {
  VocabularyPosGroup,
  VocabularySortDirection,
  VocabularySortField,
  VocabularyViewMode,
  VocabularyWordRow,
} from "@/lib/vocabulary/types";

export const MEANING_PREVIEW_LIMIT = 5;
export const TAG_PREVIEW_LIMIT = 3;
export const VOCABULARY_GROUP_PAGE_SIZE = 20;
export const UNCATEGORIZED_POS_KEY = "__none__";
export const VOCABULARY_VIEW_MODE_KEY = "notoria.vocabulary.viewMode";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DIFFICULTY_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;

export function isVocabularyViewMode(value: unknown): value is VocabularyViewMode {
  return value === "list" || value === "cards";
}

export function isKnownPartOfSpeech(
  pos: string | null | undefined,
): pos is (typeof PARTS_OF_SPEECH)[number] {
  return Boolean(
    pos && PARTS_OF_SPEECH.includes(pos as (typeof PARTS_OF_SPEECH)[number]),
  );
}

export function previewMeanings(
  word: Pick<VocabularyWordRow, "meanings">,
  limit = MEANING_PREVIEW_LIMIT,
) {
  const texts = word.meanings.map((item) => item.meaning).filter(Boolean);
  return {
    shown: texts.slice(0, limit),
    extra: Math.max(0, texts.length - limit),
    all: texts,
  };
}

export function findDifficultyTag(
  tags: VocabularyWordRow["tags"],
): VocabularyWordRow["tags"][number] | null {
  let best: VocabularyWordRow["tags"][number] | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;

  for (const tag of tags) {
    const index = DIFFICULTY_ORDER.indexOf(
      tag.tag as (typeof DIFFICULTY_ORDER)[number],
    );
    if (index >= 0 && index < bestIndex) {
      best = tag;
      bestIndex = index;
    }
  }

  return best;
}

export function visibleTags(
  tags: VocabularyWordRow["tags"],
  options?: { excludeTag?: string | null; limit?: number },
) {
  const excludeTag = options?.excludeTag ?? null;
  const limit = options?.limit ?? TAG_PREVIEW_LIMIT;
  const remaining = excludeTag
    ? tags.filter((tag) => tag.tag !== excludeTag)
    : tags;
  return {
    shown: remaining.slice(0, limit),
    extra: remaining.slice(limit),
    all: remaining,
  };
}

export function getVocabularyStats(words: VocabularyWordRow[]) {
  const weekAgo = Date.now() - WEEK_MS;
  let nouns = 0;
  let verbs = 0;
  let recent = 0;

  for (const word of words) {
    if (word.partOfSpeech === "noun") nouns += 1;
    if (word.partOfSpeech === "verb") verbs += 1;
    const created = word.createdAt ?? word.updatedAt;
    if (new Date(created).getTime() >= weekAgo) recent += 1;
  }

  return { total: words.length, nouns, verbs, recent };
}

export function filterVocabularyWords(
  words: VocabularyWordRow[],
  options: {
    search: string;
    partOfSpeechFilter: MultiFilterValue;
    tagFilter: MultiFilterValue;
  },
) {
  const query = options.search.trim().toLowerCase();

  return words.filter((word) => {
    if (!matchesMultiFilter(options.partOfSpeechFilter, word.partOfSpeech)) {
      return false;
    }

    if (
      !matchesMultiFilterAny(
        options.tagFilter,
        word.tags.map((tag) => tag.tag),
      )
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      word.word,
      ...word.meanings.map((meaning) => meaning.meaning),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function sortVocabularyWords(
  words: VocabularyWordRow[],
  field: VocabularySortField,
  direction: VocabularySortDirection,
) {
  const next = [...words];
  next.sort((a, b) => {
    if (field === "word") {
      const comparison = a.word.localeCompare(b.word, undefined, {
        sensitivity: "base",
      });
      return direction === "asc" ? comparison : -comparison;
    }

    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return direction === "asc" ? aTime - bTime : bTime - aTime;
  });
  return next;
}

export function groupVocabularyWordsByPos(
  words: VocabularyWordRow[],
): VocabularyPosGroup[] {
  const buckets = new Map<string, VocabularyWordRow[]>();

  for (const word of words) {
    const key = isKnownPartOfSpeech(word.partOfSpeech)
      ? word.partOfSpeech
      : UNCATEGORIZED_POS_KEY;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(word);
    } else {
      buckets.set(key, [word]);
    }
  }

  const groups: VocabularyPosGroup[] = [];

  for (const pos of PARTS_OF_SPEECH) {
    const items = buckets.get(pos);
    if (items?.length) {
      groups.push({ key: pos, words: items });
    }
  }

  const uncategorized = buckets.get(UNCATEGORIZED_POS_KEY);
  if (uncategorized?.length) {
    groups.push({ key: UNCATEGORIZED_POS_KEY, words: uncategorized });
  }

  return groups;
}

export function buildPageList(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];
  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  }
  return result;
}
