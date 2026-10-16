"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  normalizeMeaningUsageLabels,
  resolveMeaningUsageLabel,
} from "@/lib/vocabulary/meaning-usage";
import { cn } from "@/lib/utils";

type MeaningUsageBadgesProps = {
  labels?: string[] | null;
  className?: string;
  /** When true, show at most this many badges then +N. */
  limit?: number;
};

const CHIP_CLASS =
  "tag-chip h-5 max-w-full rounded-md border px-1.5 text-[11px] font-medium";

/**
 * Compact badges for a single meaning's usage labels.
 * Never use these as word-level tags.
 */
export function MeaningUsageBadges({
  labels,
  className,
  limit,
}: MeaningUsageBadgesProps) {
  const tTags = useTranslations("tags");
  const normalized = normalizeMeaningUsageLabels(labels);
  if (normalized.length === 0) return null;

  const shown =
    typeof limit === "number" ? normalized.slice(0, limit) : normalized;
  const extra =
    typeof limit === "number" ? Math.max(0, normalized.length - limit) : 0;

  return (
    <span
      className={cn("inline-flex min-w-0 flex-wrap items-center gap-1", className)}
    >
      {shown.map((id) => (
        <Badge
          key={id}
          variant="ghost"
          data-tag-tone="grammar"
          className={cn(CHIP_CLASS)}
        >
          <span className="truncate">
            {resolveMeaningUsageLabel(id, (key) => tTags(key))}
          </span>
        </Badge>
      ))}
      {extra > 0 ? (
        <span className="text-[11px] text-muted-foreground">+{extra}</span>
      ) : null}
    </span>
  );
}
