import type { ListeningLessonListItem } from "@/lib/listening/types";
import {
  isMultiFilterActive,
  matchesMultiFilter,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  isKnownWritingTopic,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";

export const LISTENING_SORT_OPTIONS = [
  "created:desc",
  "created:asc",
  "title:asc",
  "title:desc",
] as const;

export type ListeningSortOption = (typeof LISTENING_SORT_OPTIONS)[number];

export type ListeningListQuery = {
  search: string;
  cefr: MultiFilterValue;
  topic: MultiFilterValue;
  formality: MultiFilterValue;
  sort: ListeningSortOption;
};

export const DEFAULT_LISTENING_LIST_QUERY: ListeningListQuery = {
  search: "",
  cefr: [],
  topic: [],
  formality: [],
  sort: "created:desc",
};

export const LISTENING_FILTER_CEFR_LEVELS = WRITING_CEFR_LEVELS;
export const LISTENING_FILTER_TOPICS = WRITING_TOPICS;
export const LISTENING_FILTER_FORMALITY = WRITING_FORMALITY;

export type ListeningSearchLabels = {
  cefr: (level: WritingCefr) => string;
  topic: (topic: string) => string;
  formality: (formality: WritingFormality) => string;
};

export function isListeningListQueryFiltered(query: ListeningListQuery) {
  return (
    query.search.trim() !== "" ||
    isMultiFilterActive(query.cefr) ||
    isMultiFilterActive(query.topic) ||
    isMultiFilterActive(query.formality)
  );
}

export function isListeningSortOption(value: string): value is ListeningSortOption {
  return (LISTENING_SORT_OPTIONS as readonly string[]).includes(value);
}

function lessonMatchesQuery(
  lesson: ListeningLessonListItem,
  query: ListeningListQuery,
  labels: ListeningSearchLabels,
) {
  if (!matchesMultiFilter(query.cefr, lesson.cefrLevel)) {
    return false;
  }
  if (!matchesMultiFilter(query.topic, lesson.topic)) {
    return false;
  }
  if (!matchesMultiFilter(query.formality, lesson.formality)) {
    return false;
  }

  const needle = query.search.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    lesson.title,
    lesson.originalFilename ?? "",
    lesson.cefrLevel ?? "",
    lesson.topic ?? "",
    lesson.formality ?? "",
    lesson.cefrLevel &&
    (WRITING_CEFR_LEVELS as readonly string[]).includes(lesson.cefrLevel)
      ? labels.cefr(lesson.cefrLevel as WritingCefr)
      : "",
    lesson.topic ? labels.topic(lesson.topic) : "",
    lesson.formality &&
    (WRITING_FORMALITY as readonly string[]).includes(lesson.formality)
      ? labels.formality(lesson.formality as WritingFormality)
      : "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function compareLessons(
  a: ListeningLessonListItem,
  b: ListeningLessonListItem,
  sort: ListeningSortOption,
) {
  if (sort.startsWith("title")) {
    const comparison = a.title.localeCompare(b.title, undefined, {
      sensitivity: "base",
    });
    return sort === "title:asc" ? comparison : -comparison;
  }

  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  return sort === "created:asc" ? aTime - bTime : bTime - aTime;
}

export function filterAndSortListeningLessons(
  lessons: ListeningLessonListItem[],
  query: ListeningListQuery,
  labels: ListeningSearchLabels,
) {
  return lessons
    .filter((lesson) => lessonMatchesQuery(lesson, query, labels))
    .sort((a, b) => compareLessons(a, b, query.sort));
}

export function extraListeningTopics(lessons: ListeningLessonListItem[]) {
  const extras = new Set<string>();
  for (const lesson of lessons) {
    if (lesson.topic && !isKnownWritingTopic(lesson.topic)) {
      extras.add(lesson.topic);
    }
  }
  return [...extras].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
