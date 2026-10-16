"use client";

import { Check, Lock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuotaFeatureId, QuotaStatus } from "@/lib/billing/plans";
import {
  isQuotaExhausted,
  isQuotaUnlimited,
  quotaProgressPercent,
} from "@/lib/billing/quota-ui";
import { cn } from "@/lib/utils";

type QuotaUsageRowProps = {
  feature: QuotaFeatureId;
  quota?: QuotaStatus;
  forceUnlimited?: boolean;
  className?: string;
  markClassName?: string;
};

export function QuotaUsageRow({
  feature,
  quota,
  forceUnlimited = false,
  className,
  markClassName,
}: QuotaUsageRowProps) {
  const t = useTranslations("billing");
  const format = useFormatter();
  const unlimited = forceUnlimited || isQuotaUnlimited(quota);
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? null;
  const exhausted = !unlimited && isQuotaExhausted(quota);
  const percent = quotaProgressPercent(used, limit);
  const remaining =
    unlimited || limit == null
      ? null
      : Math.max(0, quota?.remaining ?? limit - used);
  const resetLabel = quota?.resetAt
    ? format.dateTime(new Date(quota.resetAt), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : null;

  const detail = unlimited
    ? t("quotaUnlimitedHint")
    : exhausted
      ? t("quotaExhaustedHint", {
          reset: resetLabel ?? t("quotaResetUtcMidnight"),
        })
      : t("quotaRemainingHint", {
          remaining: remaining ?? 0,
          reset: resetLabel ?? t("quotaResetUtcMidnight"),
        });

  const mark = (
    <span
      className={cn(
        "mt-0.5 inline-flex size-[1.35rem] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary",
        exhausted &&
          "bg-[color-mix(in_oklab,var(--destructive)_16%,transparent)] text-destructive",
        markClassName,
      )}
      aria-hidden
    >
      {exhausted ? (
        <Lock className="size-3.5" strokeWidth={2.5} />
      ) : (
        <Check className="size-3.5" strokeWidth={2.5} />
      )}
    </span>
  );

  return (
    <li
      className={cn(
        "flex gap-2.5 rounded-[0.7rem] bg-[color-mix(in_oklab,var(--surface-muted)_42%,transparent)] px-2.5 py-2.5 shadow-none",
        exhausted && "ring-1 ring-destructive/35",
        className,
      )}
    >
      {exhausted ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
            {mark}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left">
            {detail}
          </TooltipContent>
        </Tooltip>
      ) : (
        mark
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <p className="text-[0.9rem] font-semibold leading-snug text-ink">
            {t(`quotaLabels.${feature}`)}
          </p>
          <p
            className={cn(
              "text-[0.8rem] tabular-nums text-muted-foreground",
              exhausted && "font-medium text-destructive",
            )}
          >
            {unlimited
              ? t("cell.unlimited")
              : t("quotaCount", { used, limit: limit ?? 0 })}
          </p>
        </div>
        {percent != null ? (
          <Progress
            value={percent}
            className={cn(
              "h-1.5 shadow-none",
              exhausted && "bg-destructive/20 [&>div]:bg-destructive",
            )}
          />
        ) : null}
        {!exhausted ? (
          <p className="text-[0.75rem] leading-snug text-muted-foreground">
            {detail}
          </p>
        ) : null}
      </div>
    </li>
  );
}
