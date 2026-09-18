"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import type { MultiFilterOptionGroup } from "@/components/filters/multi-filter-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VocabularyViewModeToggle } from "@/components/vocabulary/vocabulary-view-mode-toggle";
import { PARTS_OF_SPEECH } from "@/lib/vocabulary-tags";
import type {
  VocabularySortDirection,
  VocabularySortField,
  VocabularyViewMode,
} from "@/lib/vocabulary/types";
import type { MultiFilterValue } from "@/lib/filters/multi-select";

type VocabularyToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  partOfSpeechFilter: MultiFilterValue;
  onPartOfSpeechFilterChange: (value: MultiFilterValue) => void;
  tagFilter: MultiFilterValue;
  onTagFilterChange: (value: MultiFilterValue) => void;
  tagFilterGroups: MultiFilterOptionGroup[];
  sortField: VocabularySortField;
  sortDirection: VocabularySortDirection;
  onSortChange: (field: VocabularySortField, direction: VocabularySortDirection) => void;
  viewMode: VocabularyViewMode;
  onViewModeChange: (value: VocabularyViewMode) => void;
};

export function VocabularyToolbar({
  search,
  onSearchChange,
  partOfSpeechFilter,
  onPartOfSpeechFilterChange,
  tagFilter,
  onTagFilterChange,
  tagFilterGroups,
  sortField,
  sortDirection,
  onSortChange,
  viewMode,
  onViewModeChange,
}: VocabularyToolbarProps) {
  const t = useTranslations("vocabulary");
  const tPos = useTranslations("tags.pos");
  const sortValue = `${sortField}:${sortDirection}`;

  function getSortLabel(value: string) {
    switch (value) {
      case "updated:desc":
        return t("sortUpdated");
      case "word:asc":
        return `${t("sortWord")} (${t("sortAsc")})`;
      case "word:desc":
        return `${t("sortWord")} (${t("sortDesc")})`;
      default:
        return value;
    }
  }

  const controlClassName =
    "h-10 w-full min-w-0 shrink justify-between px-2.5 font-normal";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hairline-cloud bg-surface-elevated p-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:shadow-none"
          data-tutorial="vocab-search"
        />
      </div>

      <div
        className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[36rem] lg:shrink-0"
        data-tutorial="vocab-filters"
      >
        <MultiFilterSelect
          emptyLabel={t("filterPartOfSpeech")}
          values={partOfSpeechFilter}
          onChange={onPartOfSpeechFilterChange}
          className="min-w-0 w-full"
          triggerClassName={controlClassName}
          options={PARTS_OF_SPEECH.map((pos) => ({
            value: pos,
            label: tPos(pos),
          }))}
        />

        <MultiFilterSelect
          emptyLabel={t("columns.tags")}
          values={tagFilter}
          onChange={onTagFilterChange}
          className="min-w-0 w-full"
          triggerClassName={controlClassName}
          contentClassName="max-h-80 min-w-56"
          groups={tagFilterGroups}
        />

        <div className="min-w-0 w-full">
          <Select
            value={sortValue}
            onValueChange={(value) => {
              if (!value) return;
              const [field, direction] = value.split(":") as [
                VocabularySortField,
                VocabularySortDirection,
              ];
              onSortChange(field, direction);
            }}
          >
            <SelectTrigger className={controlClassName}>
              <SelectValue>{getSortLabel(sortValue)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated:desc">{t("sortUpdated")}</SelectItem>
              <SelectItem value="word:asc">
                {t("sortWord")} ({t("sortAsc")})
              </SelectItem>
              <SelectItem value="word:desc">
                {t("sortWord")} ({t("sortDesc")})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex shrink-0 justify-end">
        <VocabularyViewModeToggle value={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
}
