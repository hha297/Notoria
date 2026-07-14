"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BUILTIN_TAG_GROUPS,
  getCustomTagName,
  getTagLabel,
  isCustomTagKey,
  PARTS_OF_SPEECH,
  type TagGroupKey,
} from "@/lib/vocabulary-tags";
import type { FlashcardFilters, FlashcardStudyMode, FlashcardWord } from "@/types/flashcards";

const TAG_FILTER_GROUPS: TagGroupKey[] = [
  "difficulty",
  "topic",
  "grammar",
  "learningStatus",
];

const STATUS_OPTIONS = ["NEW", "LEARNING", "REVIEW", "MASTERED"] as const;

type VocabularyFiltersBarProps = {
  words: FlashcardWord[];
  filters: FlashcardFilters;
  onFiltersChange: (filters: FlashcardFilters) => void;
  studyMode?: FlashcardStudyMode;
  onStudyModeChange?: (mode: FlashcardStudyMode) => void;
  showStudyMode?: boolean;
};

export function VocabularyFiltersBar({
  words,
  filters,
  onFiltersChange,
  studyMode = "word-to-meaning",
  onStudyModeChange,
  showStudyMode = false,
}: VocabularyFiltersBarProps) {
  const t = useTranslations("exercises");
  const tFlash = useTranslations("flashcards");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const tVocab = useTranslations("vocabulary");

  const customTagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const word of words) {
      for (const tag of word.tags) {
        if (isCustomTagKey(tag)) tags.add(tag);
      }
    }
    return [...tags].sort((a, b) =>
      getCustomTagName(a).localeCompare(getCustomTagName(b)),
    );
  }, [words]);

  return (
    <div className="space-y-4 rounded-2xl border border-hairline-cloud bg-card p-4">
      {showStudyMode && onStudyModeChange && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("studyMode")}
          </p>
          <ToggleGroup
            value={[studyMode]}
            onValueChange={(value) => {
              const next = value[0] as FlashcardStudyMode | undefined;
              if (next) onStudyModeChange(next);
            }}
            className="flex w-full flex-wrap gap-2"
          >
            <ToggleGroupItem value="word-to-meaning" className="flex-1 cursor-pointer">
              {tFlash("modes.wordToMeaning")}
            </ToggleGroupItem>
            <ToggleGroupItem value="meaning-to-word" className="flex-1 cursor-pointer">
              {tFlash("modes.meaningToWord")}
            </ToggleGroupItem>
            <ToggleGroupItem value="mixed" className="flex-1 cursor-pointer">
              {tFlash("modes.mixed")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <FilterSelect
          label={tVocab("filterPartOfSpeech")}
          value={filters.partOfSpeech}
          display={
            filters.partOfSpeech === "all"
              ? tVocab("filterAll")
              : tPos(filters.partOfSpeech as (typeof PARTS_OF_SPEECH)[number])
          }
          onChange={(value) => onFiltersChange({ ...filters, partOfSpeech: value })}
        >
          <SelectItem value="all">{tVocab("filterAll")}</SelectItem>
          {PARTS_OF_SPEECH.map((pos) => (
            <SelectItem key={pos} value={pos}>
              {tPos(pos)}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label={tFlash("filterStatus")}
          value={filters.status}
          display={
            filters.status === "all"
              ? tVocab("filterAll")
              : tFlash(`status.${filters.status}`)
          }
          onChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectItem value="all">{tVocab("filterAll")}</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {tFlash(`status.${status}`)}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label={tVocab("columns.tags")}
          value={filters.tag}
          display={
            filters.tag === "all"
              ? tVocab("filterAll")
              : getTagLabel(filters.tag, (key) => tTags(key))
          }
          onChange={(value) => onFiltersChange({ ...filters, tag: value })}
          contentClassName="max-h-80 min-w-56"
        >
          <SelectGroup>
            <SelectItem value="all">{tVocab("filterAll")}</SelectItem>
          </SelectGroup>
          {TAG_FILTER_GROUPS.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{tTags(`groups.${group}`)}</SelectLabel>
              {BUILTIN_TAG_GROUPS[group].map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tTags(`${group}.${tag.id}`)}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          {customTagOptions.length > 0 && (
            <SelectGroup>
              <SelectLabel>{tTags("groups.custom")}</SelectLabel>
              {customTagOptions.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {getCustomTagName(tag)}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </FilterSelect>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  display,
  onChange,
  children,
  contentClassName,
}: {
  label: string;
  value: string;
  display: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full cursor-pointer">
          <SelectValue>{display}</SelectValue>
        </SelectTrigger>
        <SelectContent className={contentClassName}>{children}</SelectContent>
      </Select>
    </div>
  );
}
