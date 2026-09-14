import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import type { VocabularyExportRow } from "@/lib/vocabulary/export/types";

const POS_ORDER = new Map(
  PARTS_OF_SPEECH.map((pos, index) => [pos, index] as const),
);

const EMPTY_KEY = "";

export type PartOfSpeechGroup<T> = {
  key: string;
  title: string;
  items: T[];
};

export function normalizePartOfSpeechKey(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "—") return EMPTY_KEY;
  return trimmed.toLowerCase();
}

function titleCasePos(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function displayTitle(
  labels: string[],
  key: string,
  uncategorizedTitle: string,
) {
  if (!key) return uncategorizedTitle;
  const named = labels
    .map((label) => label.trim())
    .filter((label) => label && label !== "—");
  const unique = new Set(named.map((label) => label.toLowerCase()));
  if (unique.size <= 1 && named[0]) {
    return titleCasePos(named[0]);
  }
  if (named[0]) return named[0];
  return titleCasePos(key);
}

function sortGroupKeys(keys: string[]) {
  return [...keys].sort((a, b) => {
    if (a === EMPTY_KEY) return 1;
    if (b === EMPTY_KEY) return -1;
    const aOrder = POS_ORDER.get(a as (typeof PARTS_OF_SPEECH)[number]);
    const bOrder = POS_ORDER.get(b as (typeof PARTS_OF_SPEECH)[number]);
    if (aOrder !== undefined || bOrder !== undefined) {
      return (aOrder ?? 1000) - (bOrder ?? 1000);
    }
    return a.localeCompare(b);
  });
}

function sortWords<T>(items: T[], getWord: (item: T) => string) {
  return [...items].sort((a, b) =>
    getWord(a).localeCompare(getWord(b), undefined, { sensitivity: "base" }),
  );
}

export function groupByPartOfSpeech<T>(
  items: T[],
  getLabel: (item: T) => string,
  getWord: (item: T) => string,
  uncategorizedTitle: string,
): PartOfSpeechGroup<T>[] {
  const buckets = new Map<string, { labels: string[]; items: T[] }>();

  for (const item of items) {
    const label = getLabel(item);
    const key = normalizePartOfSpeechKey(label);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.items.push(item);
      bucket.labels.push(label);
    } else {
      buckets.set(key, { labels: [label], items: [item] });
    }
  }

  return sortGroupKeys([...buckets.keys()]).map((key) => {
    const bucket = buckets.get(key)!;
    return {
      key,
      title: displayTitle(bucket.labels, key, uncategorizedTitle),
      items: sortWords(bucket.items, getWord),
    };
  });
}

export function groupVocabularyExportRows(
  rows: VocabularyExportRow[],
  uncategorizedTitle: string,
) {
  return groupByPartOfSpeech(
    rows,
    (row) => row.partOfSpeech,
    (row) => row.word,
    uncategorizedTitle,
  );
}
