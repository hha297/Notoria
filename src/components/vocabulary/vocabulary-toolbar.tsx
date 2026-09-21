"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { CollapsibleRefine } from "@/components/filters/collapsible-refine";
import {
  MultiFilterSelect,
  type MultiFilterOption,
  type MultiFilterOptionGroup,
} from "@/components/filters/multi-filter-select";
import {
  WritingChipPicker,
  WritingFilterChipPicker,
} from "@/components/writing/writing-chip-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isMultiFilterActive } from "@/lib/filters/multi-select";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import type { MultiFilterValue } from "@/lib/filters/multi-select";
import type {
  VocabularySortDirection,
  VocabularySortField,
} from "@/lib/vocabulary/types";

type VocabularyToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  partOfSpeechFilter: MultiFilterValue;
  onPartOfSpeechFilterChange: (value: MultiFilterValue) => void;
  tagFilter: MultiFilterValue;
  onTagFilterChange: (value: MultiFilterValue) => void;
  tagFilterGroups: MultiFilterOptionGroup[];
  customTagOptions: MultiFilterOption[];
  sortField: VocabularySortField;
  sortDirection: VocabularySortDirection;
  onSortChange: (field: VocabularySortField, direction: VocabularySortDirection) => void;
};

function scopedGroupValues(
  allValues: MultiFilterValue,
  optionValues: readonly string[],
): MultiFilterValue {
  const allowed = new Set(optionValues);
  return allValues.filter((value) => allowed.has(value));
}

function replaceGroupValues(
  allValues: MultiFilterValue,
  optionValues: readonly string[],
  nextGroupValues: MultiFilterValue,
): MultiFilterValue {
  const allowed = new Set(optionValues);
  const others = allValues.filter((value) => !allowed.has(value));
  return [...others, ...nextGroupValues];
}

export function VocabularyToolbar({
  search,
  onSearchChange,
  partOfSpeechFilter,
  onPartOfSpeechFilterChange,
  tagFilter,
  onTagFilterChange,
  tagFilterGroups,
  customTagOptions,
  sortField,
  sortDirection,
  onSortChange,
}: VocabularyToolbarProps) {
  const t = useTranslations("vocabulary");
  const tCommon = useTranslations("common");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const sortValue = `${sortField}:${sortDirection}`;
  const customOptionValues = customTagOptions.map((option) => option.value);
  const customFilterValues = scopedGroupValues(tagFilter, customOptionValues);
  const filtersActive =
    isMultiFilterActive(partOfSpeechFilter) ||
    isMultiFilterActive(tagFilter) ||
    sortValue !== "updated:desc";

  return (
    <div className="writing-spine-tools" data-tutorial="vocab-filters">
      <CollapsibleRefine
        routeAction="vocab"
        label={tCommon("filters")}
        hideLabel={tCommon("hideFilters")}
        active={filtersActive}
        search={
          <div className="writing-spine-search-wrap">
            <Search className="writing-spine-search-icon" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="writing-spine-search"
              data-tutorial="vocab-search"
            />
          </div>
        }
      >
        <WritingFilterChipPicker
          labelId="vocab-filter-pos"
          label={t("filterPartOfSpeech")}
          allLabel={t("filterAll")}
          values={partOfSpeechFilter}
          onChange={onPartOfSpeechFilterChange}
          options={PARTS_OF_SPEECH.map((pos) => ({
            value: pos,
            label: tPos(pos),
          }))}
        />

        {tagFilterGroups.map((group) => {
          const optionValues = group.options.map((option) => option.value);
          return (
            <WritingFilterChipPicker
              key={group.label}
              labelId={`vocab-filter-tag-${group.label}`}
              label={group.label}
              allLabel={t("filterAll")}
              values={scopedGroupValues(tagFilter, optionValues)}
              onChange={(next) =>
                onTagFilterChange(
                  replaceGroupValues(tagFilter, optionValues, next),
                )
              }
              options={group.options.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          );
        })}

        {customTagOptions.length > 0 ? (
          <div className="space-y-2">
            <Label id="vocab-filter-custom-tags">
              {tTags("groups.custom")}
            </Label>
            <MultiFilterSelect
              emptyLabel={t("filterAll")}
              values={customFilterValues}
              onChange={(next) =>
                onTagFilterChange(
                  replaceGroupValues(tagFilter, customOptionValues, next),
                )
              }
              options={customTagOptions}
              searchable
              className="max-w-xs"
              triggerClassName="vocab-custom-tag-trigger"
              contentClassName="vocab-custom-tag-menu max-h-72"
            />
          </div>
        ) : null}

        <WritingChipPicker
          labelId="vocab-filter-sort"
          label={t("sortBy")}
          value={sortValue}
          onChange={(value) => {
            const [field, direction] = value.split(":") as [
              VocabularySortField,
              VocabularySortDirection,
            ];
            onSortChange(field, direction);
          }}
          options={[
            { value: "updated:desc", label: t("sortUpdated") },
            {
              value: "word:asc",
              label: `${t("sortWord")} (${t("sortAsc")})`,
            },
            {
              value: "word:desc",
              label: `${t("sortWord")} (${t("sortDesc")})`,
            },
          ]}
        />
      </CollapsibleRefine>
    </div>
  );
}
