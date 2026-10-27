"use client";

import { useTranslations } from "next-intl";
import { MeaningUsageBadges } from "@/components/vocabulary/meaning-usage-badges";
import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { MEANING_PREVIEW_LIMIT } from "@/lib/vocabulary/display";
import { cn } from "@/lib/utils";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyMeaningPreviewProps = {
  word: Pick<VocabularyWordRow, "meanings">;
  className?: string;
  emptyLabel?: string;
  clamp?: boolean;
  variant?: "list" | "card";
  limit?: number;
};

/**
 * Compact list/card preview: each meaning stays associated with its usage badges.
 */
export function VocabularyMeaningPreview({
  word,
  className,
  emptyLabel,
  clamp = true,
  variant = "list",
  limit,
}: VocabularyMeaningPreviewProps) {
  const t = useTranslations("vocabulary");
  const meanings = word.meanings
    .filter((item) => item.meaning.trim())
    .sort((a, b) => {
      if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) {
        return a.isPrimary ? -1 : 1;
      }
      return a.sortOrder - b.sortOrder;
    });
  const visibleLimit = limit ?? MEANING_PREVIEW_LIMIT;
  const shown = meanings.slice(0, visibleLimit);
  const extra = Math.max(0, meanings.length - visibleLimit);
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
        mx(
          featureStyles,
          "vocab-meaning-preview",
          variant === "card"
            ? "vocab-meaning-preview-card"
            : "vocab-meaning-preview-list",
        ),
        "min-w-0",
        className,
      )}
    >
      <div className={mx(featureStyles, "vocab-meaning-stack")}>
        {shown.map((item, index) => (
          <div
            key={item.id}
            className={mx(
              featureStyles,
              "vocab-meaning-row",
              item.isPrimary && "vocab-meaning-primary",
            )}
          >
            <span
              className={mx(featureStyles, "vocab-meaning-marker")}
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={mx(featureStyles, "vocab-meaning-copy")}>
              <span
                className={cn(
                  mx(featureStyles, "vocab-meaning-text"),
                  clamp && index === 0 && "line-clamp-2",
                  clamp && index > 0 && "line-clamp-1",
                )}
              >
                {item.meaning}
              </span>
              <MeaningUsageBadges labels={item.usageLabels} limit={2} />
            </span>
          </div>
        ))}
      </div>
      {extra > 0 ? (
        <div className={mx(featureStyles, "vocab-meaning-more-row")}>
          <span className={mx(featureStyles, "vocab-meaning-more-marker")}>
            +
          </span>
          <span className={mx(featureStyles, "vocab-meaning-more")}>
            {t("moreMeanings", { count: extra })}
          </span>
        </div>
      ) : null}
    </div>
  );
}
