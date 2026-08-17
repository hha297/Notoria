"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_LISTENING_LIST_QUERY,
  extraListeningTopics,
  isListeningListQueryFiltered,
  isListeningSortOption,
  LISTENING_FILTER_CEFR_LEVELS,
  LISTENING_FILTER_FORMALITY,
  LISTENING_FILTER_TOPICS,
  type ListeningListQuery,
} from "@/lib/listening/filters";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import { isKnownWritingTopic, type WritingCefr, type WritingFormality } from "@/lib/writing/meta";

type ListeningFiltersBarProps = {
  lessons: ListeningLessonListItem[];
  query: ListeningListQuery;
  onQueryChange: (query: ListeningListQuery) => void;
};

function sortLabel(sort: ListeningListQuery["sort"], t: ReturnType<typeof useTranslations>) {
  switch (sort) {
    case "created:desc":
      return t("sortNewest");
    case "created:asc":
      return t("sortOldest");
    case "title:asc":
      return t("sortTitleAsc");
    case "title:desc":
      return t("sortTitleDesc");
  }
}

const triggerClassName = "h-9 w-28 shrink-0 sm:w-32";

export function ListeningFiltersBar({
  lessons,
  query,
  onQueryChange,
}: ListeningFiltersBarProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const customTopics = extraListeningTopics(lessons);
  const filtersActive = isListeningListQueryFiltered(query);

  function patch(partial: Partial<ListeningListQuery>) {
    onQueryChange({ ...query, ...partial });
  }

  function clearFilters() {
    onQueryChange({
      ...query,
      search: DEFAULT_LISTENING_LIST_QUERY.search,
      cefr: DEFAULT_LISTENING_LIST_QUERY.cefr,
      topic: DEFAULT_LISTENING_LIST_QUERY.topic,
      formality: DEFAULT_LISTENING_LIST_QUERY.formality,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
      <Input
        value={query.search}
        onChange={(event) => patch({ search: event.target.value })}
        placeholder={t("searchPlaceholder")}
        className="h-9 min-w-[12rem] flex-1"
      />

      <Select
        value={query.cefr}
        onValueChange={(value) => value && patch({ cefr: value })}
      >
        <SelectTrigger size="sm" className={triggerClassName}>
          <SelectValue>
            {query.cefr === "all"
              ? t("filterCefr")
              : tMeta(`cefr.${query.cefr as WritingCefr}`)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
          {LISTENING_FILTER_CEFR_LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {tMeta(`cefr.${level}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.topic}
        onValueChange={(value) => value && patch({ topic: value })}
      >
        <SelectTrigger size="sm" className={triggerClassName}>
          <SelectValue>
            {query.topic === "all"
              ? t("filterTopic")
              : isKnownWritingTopic(query.topic)
                ? tMeta(`topics.${query.topic}`)
                : query.topic}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
          {LISTENING_FILTER_TOPICS.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {tMeta(`topics.${topic}`)}
            </SelectItem>
          ))}
          {customTopics.map((topic) => (
            <SelectItem key={topic} value={topic}>
              {topic}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.formality}
        onValueChange={(value) => value && patch({ formality: value })}
      >
        <SelectTrigger size="sm" className={triggerClassName}>
          <SelectValue>
            {query.formality === "all"
              ? t("filterFormality")
              : tMeta(`formality.${query.formality as WritingFormality}`)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAll")}</SelectItem>
          {LISTENING_FILTER_FORMALITY.map((item) => (
            <SelectItem key={item} value={item}>
              {tMeta(`formality.${item}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.sort}
        onValueChange={(value) =>
          value && isListeningSortOption(value) && patch({ sort: value })
        }
      >
        <SelectTrigger size="sm" className="h-9 w-36 shrink-0">
          <SelectValue>{sortLabel(query.sort, t)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created:desc">{t("sortNewest")}</SelectItem>
          <SelectItem value="created:asc">{t("sortOldest")}</SelectItem>
          <SelectItem value="title:asc">{t("sortTitleAsc")}</SelectItem>
          <SelectItem value="title:desc">{t("sortTitleDesc")}</SelectItem>
        </SelectContent>
      </Select>

      {filtersActive ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-9 shrink-0"
          onClick={clearFilters}
          aria-label={t("clearFilters")}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
