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

type FlashcardFiltersBarProps = {
  words: FlashcardWord[];
  filters: FlashcardFilters;
  studyMode: FlashcardStudyMode;
  onFiltersChange: (filters: FlashcardFilters) => void;
  onStudyModeChange: (mode: FlashcardStudyMode) => void;
};

export function FlashcardFiltersBar({
  words,
  filters,
  studyMode,
  onFiltersChange,
  onStudyModeChange,
}: FlashcardFiltersBarProps) {
  const t = useTranslations("flashcards");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const tVocab = useTranslations("vocabulary");

  const customTagOptions = useMemo(() => {
    const tags = new Set<string>();

    for (const word of words) {
      for (const tag of word.tags) {
        if (isCustomTagKey(tag)) {
          tags.add(tag);
        }
      }
    }

    return [...tags].sort((a, b) =>
      getCustomTagName(a).localeCompare(getCustomTagName(b)),
    );
  }, [words]);

  return (
    <div className="space-y-4 rounded-2xl border border-hairline-cloud bg-card p-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("studyMode")}
        </p>
        <ToggleGroup
          value={[studyMode]}
          onValueChange={(value) => {
            const next = value[0] as FlashcardStudyMode | undefined;
            if (next) {
              onStudyModeChange(next);
            }
          }}
          className="flex w-full flex-wrap gap-2"
        >
          <ToggleGroupItem value="word-to-meaning" className="flex-1 cursor-pointer">
            {t("modes.wordToMeaning")}
          </ToggleGroupItem>
          <ToggleGroupItem value="meaning-to-word" className="flex-1 cursor-pointer">
            {t("modes.meaningToWord")}
          </ToggleGroupItem>
          <ToggleGroupItem value="mixed" className="flex-1 cursor-pointer">
            {t("modes.mixed")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tVocab("filterPartOfSpeech")}
          </p>
          <Select
            value={filters.partOfSpeech}
            onValueChange={(value) =>
              value &&
              onFiltersChange({ ...filters, partOfSpeech: value })
            }
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder={tVocab("filterPartOfSpeech")}>
                {filters.partOfSpeech === "all"
                  ? tVocab("filterAll")
                  : tPos(filters.partOfSpeech as (typeof PARTS_OF_SPEECH)[number])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tVocab("filterAll")}</SelectItem>
              {PARTS_OF_SPEECH.map((pos) => (
                <SelectItem key={pos} value={pos}>
                  {tPos(pos)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("filterStatus")}
          </p>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              value && onFiltersChange({ ...filters, status: value })
            }
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder={t("filterStatus")}>
                {filters.status === "all"
                  ? tVocab("filterAll")
                  : t(`status.${filters.status}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tVocab("filterAll")}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tVocab("columns.tags")}
          </p>
          <Select
            value={filters.tag}
            onValueChange={(value) =>
              value && onFiltersChange({ ...filters, tag: value })
            }
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder={tVocab("columns.tags")}>
                {filters.tag === "all"
                  ? tVocab("filterAll")
                  : getTagLabel(filters.tag, (key) => tTags(key))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80 min-w-56">
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
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
