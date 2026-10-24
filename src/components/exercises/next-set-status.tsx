"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { NextSetStatus } from "@/hooks/use-exercise-next-set";
import { cn } from "@/lib/utils";

type NextSetStatusChipProps = {
  status: NextSetStatus;
  onRetry?: () => void;
  onOpen?: () => void;
  className?: string;
};

/**
 * Unobtrusive background next-set indicator — never covers inputs or steals focus.
 */
export function NextSetStatusChip({
  status,
  onRetry,
  onOpen,
  className,
}: NextSetStatusChipProps) {
  const t = useTranslations("exercises.processing");

  // Preparing runs in the background — only surface ready / failed.
  if (status === "idle" || status === "preparing" || status === "scheduled") {
    return null;
  }

  const label =
    status === "ready" ? t("nextSetReady") : t("nextSetFailed");

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-(--exercise-accent)/20 bg-(--exercise-accent-soft)/60 px-3 py-1.5 text-xs text-ink/80 backdrop-blur-sm dark:bg-(--exercise-accent-soft)/30",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {status === "ready" ? (
        <Sparkles className="size-3.5 shrink-0 text-(--exercise-accent)" />
      ) : (
        <RefreshCw className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <span>{label}</span>
      {status === "failed" && onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onRetry}
        >
          {t("nextSetRetry")}
        </Button>
      ) : null}
      {status === "ready" && onOpen ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onOpen}
        >
          {t("openNextSet")}
        </Button>
      ) : null}
    </div>
  );
}
