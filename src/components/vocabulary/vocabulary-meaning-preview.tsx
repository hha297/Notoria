"use client";

import { useTranslations } from "next-intl";
import { MeaningUsageBadges } from "@/components/vocabulary/meaning-usage-badges";
import { MEANING_PREVIEW_LIMIT } from "@/lib/vocabulary/display";
import { cn } from "@/lib/utils";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyMeaningPreviewProps = {
  word: VocabularyWordRow;
  className?: string;
  emptyLabel?: string;
  clamp?: boolean;
};

/**
 * Compact list/card preview: each meaning stays associated with its usage badges.
 */
export function VocabularyMeaningPreview({
  word,
  className,
  emptyLabel,
  clamp = true,
}: VocabularyMeaningPreviewProps) {
  const t = useTranslations("vocabulary");
  const meanings = word.meanings.filter((item) => item.meaning.trim());
  const shown = meanings.slice(0, MEANING_PREVIEW_LIMIT);
  const extra = Math.max(0, meanings.length - MEANING_PREVIEW_LIMIT);
  const title = meanings
    .map((item) => {
      const labels = item.usageLabels?.length
        ? ` (${item.usageLabels.join(", ")})`
        : "";
      return `${item.meaning}${labels}`;
    })
    .join(" · ");

  if (shown.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyLabel ?? "—"}
      </span>
    );
  }

  return (
    <div
      title={title}
      className={cn(
        "min-w-0 text-sm leading-snug text-ink/80",
        clamp && "line-clamp-3",
        className,
      )}
    >
      {shown.map((item, index) => (
        <span key={item.id} className="inline">
          {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
          <span className="inline-flex max-w-full flex-wrap items-baseline gap-1">
            <span>{item.meaning}</span>
            <MeaningUsageBadges labels={item.usageLabels} limit={2} />
          </span>
        </span>
      ))}
      {extra > 0 ? (
        <span className="ml-1 text-xs text-muted-foreground">
          {t("moreMeanings", { count: extra })}
        </span>
      ) : null}
    </div>
  );
}
