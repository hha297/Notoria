"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
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

  return (
    <div className={mx(featureStyles, "vocab-spine-tools writing-spine-tools")}>
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

      <div className={mx(featureStyles, "vocab-spine-footer")}>
        <div
          className={mx(featureStyles, "vocab-spine-filters min-w-0 flex-1")}
          data-tutorial="vocab-filters"
        >
          <MultiFilterSelect
            emptyLabel={t("filterPartOfSpeech")}
            values={partOfSpeechFilter}
            onChange={onPartOfSpeechFilterChange}
            className="min-w-0 w-full"
            triggerClassName="vocab-filter-trigger"
            contentClassName="vocab-filter-menu"
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
            triggerClassName="vocab-filter-trigger"
            contentClassName="vocab-filter-menu max-h-80 min-w-56"
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
              <SelectTrigger className={mx(featureStyles, "vocab-filter-trigger")}>
                <SelectValue>{getSortLabel(sortValue)}</SelectValue>
              </SelectTrigger>
              <SelectContent className={mx(featureStyles, "vocab-filter-menu")}>
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

        <VocabularyViewModeToggle value={viewMode} onChange={onViewModeChange} />
      </div>
    </div>
  );
}
