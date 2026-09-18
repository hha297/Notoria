"use client";

import { useTranslations } from "next-intl";
import { previewMeanings } from "@/lib/vocabulary/display";
import { cn } from "@/lib/utils";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";

type VocabularyMeaningPreviewProps = {
  word: VocabularyWordRow;
  className?: string;
  emptyLabel?: string;
  clamp?: boolean;
};

export function VocabularyMeaningPreview({
  word,
  className,
  emptyLabel,
  clamp = true,
}: VocabularyMeaningPreviewProps) {
  const t = useTranslations("vocabulary");
  const { shown, extra, all } = previewMeanings(word);

  if (shown.length === 0) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyLabel ?? "—"}
      </span>
    );
  }

  return (
    <p
      title={all.join(" · ")}
      className={cn(
        "min-w-0 text-sm leading-snug text-ink/80",
        clamp && "line-clamp-2",
        className,
      )}
    >
      {shown.join(" · ")}
      {extra > 0 ? (
        <span className="ml-1 text-xs text-muted-foreground">
          {t("moreMeanings", { count: extra })}
        </span>
      ) : null}
    </p>
  );
}
