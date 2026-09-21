"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import {
  BUILTIN_TAG_GROUPS,
  getCustomTagName,
  isCustomTagKey,
  PARTS_OF_SPEECH,
  TAG_PICKER_GROUPS,
} from "@/lib/vocabulary-tags";
import type { FlashcardFilters, FlashcardStudyMode, FlashcardWord } from "@/types/flashcards";
import type { MultipleChoiceStudyMode } from "@/lib/exercises/multiple-choice";
import type { TypeAnswerStudyMode } from "@/lib/exercises/type-answer";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["NEW", "LEARNING", "REVIEW", "MASTERED"] as const;

type VocabularyFiltersBarProps = {
  words: FlashcardWord[];
  filters: FlashcardFilters;
  onFiltersChange: (filters: FlashcardFilters) => void;
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

  const tagGroups = useMemo(
    () => [
      ...TAG_PICKER_GROUPS.map((group) => ({
        label: tTags(`groups.${group}`),
        options: BUILTIN_TAG_GROUPS[group].map((tag) => ({
          value: tag.id,
          label: tTags(`${group}.${tag.id}`),
        })),
      })),
      ...(customTagOptions.length > 0
        ? [
            {
              label: tTags("groups.custom"),
              options: customTagOptions.map((tag) => ({
                value: tag,
                label: getCustomTagName(tag),
              })),
            },
          ]
        : []),
    ],
    [customTagOptions, tTags],
  );

  return (
    <div className="space-y-4 rounded-2xl border border-hairline-cloud bg-card p-3 sm:p-4">
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
            className="flex w-full flex-wrap gap-2"
          >
            <ToggleGroupItem value="word-to-meaning" className="flex-1 cursor-pointer">
              {tFlash("modes.wordToMeaning")}
            </ToggleGroupItem>
            <ToggleGroupItem value="meaning-to-word" className="flex-1 cursor-pointer">
              {tFlash("modes.meaningToWord")}
            </ToggleGroupItem>
            {studyModeVariant === "with-contextual" ? (
              <ToggleGroupItem
                value="contextual"
                className={cn(
                  "flex-1 cursor-pointer gap-1.5",
                  contextualPro && "data-[state=on]:bg-accent-lime/20",
                )}
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
              <ToggleGroupItem value="mixed" className="flex-1 cursor-pointer">
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
          contentClassName="max-h-80 min-w-56"
          groups={tagGroups}
        />
      </div>
    </div>
  );
}
