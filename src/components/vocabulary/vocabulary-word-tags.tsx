"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TAG_PREVIEW_LIMIT, visibleTags } from "@/lib/vocabulary/display";
import { getTagLabel, getTagTone } from "@/lib/vocabulary-tags";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";
import { cn } from "@/lib/utils";

type VocabularyWordTagsProps = {
  tags: VocabularyWordRow["tags"];
  limit?: number;
  emptyLabel?: string;
  className?: string;
  /**
   * Tint chips from the parent card POS accent (`--vocab-pos-accent`)
   * instead of per-tag group tones.
   */
  matchCardAccent?: boolean;
};

const TAG_CHIP_CLASS =
  "tag-chip h-5 max-w-full rounded-md px-1.5 text-[11px] font-medium";

export function VocabularyWordTags({
  tags,
  limit = TAG_PREVIEW_LIMIT,
  emptyLabel,
  className,
  matchCardAccent = false,
}: VocabularyWordTagsProps) {
  const t = useTranslations("vocabulary");
  const tTags = useTranslations("tags");

  if (tags.length === 0) {
    return emptyLabel ? (
      <span className="text-muted-foreground">{emptyLabel}</span>
    ) : null;
  }

  const { shown, extra } = visibleTags(tags, { limit });
  const extraLabels = extra.map((tag) =>
    getTagLabel(tag.tag, (key) => tTags(key)),
  );

  return (
    <div className={className ?? "flex flex-wrap gap-1"}>
      {shown.map((tag) => (
        <Badge
          key={tag.id}
          /* ghost avoids outline control-surface (grey elevated fill) */
          variant="ghost"
          data-tag-tone={matchCardAccent ? "card" : getTagTone(tag.tag)}
          className={cn(TAG_CHIP_CLASS, "border")}
        >
          <span className="truncate">
            {getTagLabel(tag.tag, (key) => tTags(key))}
          </span>
        </Badge>
      ))}
      {extra.length > 0 ? (
        <Tooltip>
          <TooltipTrigger
            data-tag-tone={matchCardAccent ? "card" : "neutral"}
            className={cn(
              "inline-flex cursor-default items-center border",
              TAG_CHIP_CLASS,
            )}
          >
            {t("moreTags", { count: extra.length })}
          </TooltipTrigger>
          <TooltipContent className="max-w-56 text-left">
            {extraLabels.join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
