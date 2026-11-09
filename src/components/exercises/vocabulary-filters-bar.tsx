"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import {
  BUILTIN_TAG_GROUPS,
  customTagKey,
  getCustomTagName,
  isCustomTagKey,
  PARTS_OF_SPEECH,
  TAG_PICKER_GROUPS,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import { workspaceCustomTagsQueryOptions } from "@/lib/query/options";
import type { FlashcardFilters, FlashcardStudyMode, FlashcardWord } from "@/types/flashcards";
import type { MultipleChoiceStudyMode } from "@/lib/exercises/multiple-choice";
import type { TypeAnswerStudyMode } from "@/lib/exercises/type-answer";

const STATUS_OPTIONS = ["NEW", "LEARNING", "REVIEW", "MASTERED"] as const;

type VocabularyFiltersBarProps = {
  words: FlashcardWord[];
  filters: FlashcardFilters;
  onFiltersChange: (filters: FlashcardFilters) => void;
  /** Used to load the full workspace custom-tag list (not only tags on loaded words). */
  workspaceId?: string;
  studyMode?: FlashcardStudyMode | MultipleChoiceStudyMode | TypeAnswerStudyMode;
  onStudyModeChange?: (mode: string) => void;
  showStudyMode?: boolean;
  /** Flashcards keep Mixed; MC / Type the Answer show Contextual. */
  studyModeVariant?: "standard" | "with-contextual";
  /** When Contextual is Pro-locked, show Pro badge. */
  contextualPro?: boolean;
};

export function VocabularyFiltersBar({
  words,
  filters,
  onFiltersChange,
  workspaceId,
  studyMode = "word-to-meaning",
  onStudyModeChange,
  showStudyMode = false,
  studyModeVariant = "standard",
  contextualPro = false,
}: VocabularyFiltersBarProps) {
  const t = useTranslations("exercises");
  const tFlash = useTranslations("flashcards");
  const tMc = useTranslations("exercises.multipleChoice");
  const tBilling = useTranslations("billing");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const tVocab = useTranslations("vocabulary");
  const tSearch = useTranslations("search");

  const customTagsQuery = useQuery({
    ...workspaceCustomTagsQueryOptions(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  });

  const customTagOptions = useMemo(() => {
    const namesFromWords: string[] = [];
    for (const word of words) {
      for (const tag of word.tags) {
        if (isCustomTagKey(tag)) namesFromWords.push(getCustomTagName(tag));
      }
    }
    // Full workspace list + tags on loaded words (covers orphaned / unused tags).
    return uniqueCustomTagNames([
      ...namesFromWords,
      ...(customTagsQuery.data ?? []),
    ]).map((name) => customTagKey(name));
  }, [customTagsQuery.data, words]);

  const tagGroups = useMemo(() => {
    const builtin = TAG_PICKER_GROUPS.map((group) => ({
      label: tTags(`groups.${group}`),
      options: BUILTIN_TAG_GROUPS[group].map((tag) => ({
        value: tag.id,
        label: tTags(`${group}.${tag.id}`),
      })),
    }));
    const custom =
      customTagOptions.length > 0
        ? [
            {
              label: tTags("groups.custom"),
              options: customTagOptions.map((tag) => ({
                value: tag,
                label: getCustomTagName(tag),
              })),
            },
          ]
        : [];
    // Custom first — long builtin lists used to bury personal tags.
    return [...custom, ...builtin];
  }, [customTagOptions, tTags]);

  return (
    <div className="exercise-panel space-y-4 rounded-2xl border p-3 sm:p-4">
      {showStudyMode && onStudyModeChange && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("studyMode")}
          </p>
          <ToggleGroup
            value={[studyMode]}
            onValueChange={(value) => {
              const next = value[0];
              if (next) onStudyModeChange(next);
            }}
            className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            <ToggleGroupItem
              value="word-to-meaning"
              variant="outline"
              className="exercise-study-mode-toggle h-auto min-h-10 w-full justify-center whitespace-normal px-3 py-2.5 text-center sm:flex-1"
            >
              {tFlash("modes.wordToMeaning")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="meaning-to-word"
              variant="outline"
              className="exercise-study-mode-toggle h-auto min-h-10 w-full justify-center whitespace-normal px-3 py-2.5 text-center sm:flex-1"
            >
              {tFlash("modes.meaningToWord")}
            </ToggleGroupItem>
            {studyModeVariant === "with-contextual" ? (
              <ToggleGroupItem
                value="contextual"
                variant="outline"
                className="exercise-study-mode-toggle h-auto min-h-10 w-full justify-center gap-1.5 whitespace-normal px-3 py-2.5 text-center sm:flex-1"
              >
                {tMc("modes.contextual")}
                {contextualPro ? (
                  <Badge
                    variant="pro"
                    className="px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide"
                  >
                    {tBilling("proBadge")}
                  </Badge>
                ) : null}
              </ToggleGroupItem>
            ) : (
              <ToggleGroupItem
                value="mixed"
                variant="outline"
                className="exercise-study-mode-toggle h-auto min-h-10 w-full justify-center whitespace-normal px-3 py-2.5 text-center sm:flex-1"
              >
                {tFlash("modes.mixed")}
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <MultiFilterSelect
          label={tVocab("filterPartOfSpeech")}
          emptyLabel={tVocab("filterAll")}
          values={filters.partOfSpeech}
          onChange={(partOfSpeech) => onFiltersChange({ ...filters, partOfSpeech })}
          triggerClassName="h-10 sm:h-8"
          options={PARTS_OF_SPEECH.map((pos) => ({
            value: pos,
            label: tPos(pos),
          }))}
        />

        <MultiFilterSelect
          label={tFlash("filterStatus")}
          emptyLabel={tVocab("filterAll")}
          values={filters.status}
          onChange={(status) => onFiltersChange({ ...filters, status })}
          triggerClassName="h-10 sm:h-8"
          options={STATUS_OPTIONS.map((status) => ({
            value: status,
            label: tFlash(`status.${status}`),
          }))}
        />

        <MultiFilterSelect
          label={tVocab("columns.tags")}
          emptyLabel={tVocab("filterAll")}
          values={filters.tag}
          onChange={(tag) => onFiltersChange({ ...filters, tag })}
          triggerClassName="h-10 sm:h-8"
          contentClassName="max-h-[min(24rem,70vh)] min-w-56"
          groups={tagGroups}
          searchable
          searchPlaceholder={tSearch("placeholder")}
        />
      </div>
    </div>
  );
}
