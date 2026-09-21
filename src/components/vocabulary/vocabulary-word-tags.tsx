"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TAG_PREVIEW_LIMIT, visibleTags } from "@/lib/vocabulary/display";
import { getTagLabel } from "@/lib/vocabulary-tags";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyWordTagsProps = {
  tags: VocabularyWordRow["tags"];
  limit?: number;
  emptyLabel?: string;
  className?: string;
};

export function VocabularyWordTags({
  tags,
  limit = TAG_PREVIEW_LIMIT,
  emptyLabel,
  className,
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
          variant="outline"
          className="h-5 max-w-full rounded-md border-hairline-cloud bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <span className="truncate">
            {getTagLabel(tag.tag, (key) => tTags(key))}
          </span>
        </Badge>
      ))}
      {extra.length > 0 ? (
        <Tooltip>
          <TooltipTrigger className="inline-flex h-5 cursor-default items-center rounded-md border border-hairline-cloud bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground">
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
