"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { CollapsibleRefine } from "@/components/filters/collapsible-refine";
import {
  WritingChipPicker,
  WritingFilterChipPicker,
} from "@/components/writing/writing-chip-picker";
import { Input } from "@/components/ui/input";
import {
  extraListeningTopics,
  isListeningSortOption,
  LISTENING_FILTER_CEFR_LEVELS,
  LISTENING_FILTER_FORMALITY,
  LISTENING_FILTER_TOPICS,
  type ListeningListQuery,
} from "@/lib/listening/filters";
import { isMultiFilterActive } from "@/lib/filters/multi-select";
import type { ListeningLessonListItem } from "@/lib/listening/types";
import type { WritingCefr, WritingFormality } from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

type ListeningFiltersBarProps = {
  lessons: ListeningLessonListItem[];
  query: ListeningListQuery;
  onQueryChange: (query: ListeningListQuery) => void;
};

export function ListeningFiltersBar({
  lessons,
  query,
  onQueryChange,
}: ListeningFiltersBarProps) {
  const t = useTranslations("listening");
  const tCommon = useTranslations("common");
  const tMeta = useTranslations("listening.meta");
  const tTags = useTranslations("tags");
  const customTopics = extraListeningTopics(lessons);

  function patch(partial: Partial<ListeningListQuery>) {
    onQueryChange({ ...query, ...partial });
  }

  const refineActive =
    isMultiFilterActive(query.cefr) ||
    isMultiFilterActive(query.topic) ||
    isMultiFilterActive(query.formality) ||
    query.sort !== "created:desc";

  return (
    <div className="writing-spine-tools" data-tutorial="listening-filters">
      <CollapsibleRefine
        routeAction="listen"
        label={tCommon("filters")}
        hideLabel={tCommon("hideFilters")}
        active={refineActive}
        search={
          <div className="writing-spine-search-wrap">
            <Search className="writing-spine-search-icon" aria-hidden="true" />
            <Input
              value={query.search}
              onChange={(event) => patch({ search: event.target.value })}
              placeholder={t("searchPlaceholder")}
              className="writing-spine-search"
            />
          </div>
        }
      >
        <WritingFilterChipPicker
          labelId="listening-filter-cefr"
          label={tMeta("cefrLabel")}
          allLabel={t("filterAll")}
          values={query.cefr}
          onChange={(cefr) => patch({ cefr })}
          options={LISTENING_FILTER_CEFR_LEVELS.map((level) => ({
            value: level,
            label: tMeta(`cefr.${level as WritingCefr}`),
          }))}
        />
        <WritingFilterChipPicker
          labelId="listening-filter-formality"
          label={tMeta("formalityLabel")}
          allLabel={t("filterAll")}
          values={query.formality}
          onChange={(formality) => patch({ formality })}
          options={LISTENING_FILTER_FORMALITY.map((item) => ({
            value: item,
            label: tMeta(`formality.${item as WritingFormality}`),
          }))}
        />
        <WritingFilterChipPicker
          labelId="listening-filter-topic"
          label={tMeta("topicLabel")}
          allLabel={t("filterAll")}
          values={query.topic}
          onChange={(topic) => patch({ topic })}
          options={[
            ...LISTENING_FILTER_TOPICS.map((topic) => ({
              value: topic,
              label: resolveTopicLabel(topic, (key) => tTags(key)),
            })),
            ...customTopics.map((topic) => ({
              value: topic,
              label: topic,
            })),
          ]}
        />
        <WritingChipPicker
          labelId="listening-filter-sort"
          label={t("sortBy")}
          value={query.sort}
          onChange={(value) => {
            if (isListeningSortOption(value)) {
              patch({ sort: value });
            }
          }}
          options={[
            {
              value: "created:desc",
              label: t("sortNewest"),
            },
            {
              value: "created:asc",
              label: t("sortOldest"),
            },
            {
              value: "title:asc",
              label: t("sortTitleAsc"),
            },
            {
              value: "title:desc",
              label: t("sortTitleDesc"),
            },
          ]}
        />
      </CollapsibleRefine>
    </div>
  );
}
