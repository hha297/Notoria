"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ExerciseProgressHeaderProps = {
  current?: number;
  total?: number;
  progressLabel: string;
  scoreLabel?: string;
  hint?: string;
  /** Kept for callers; the bar is driven by current/total when available. */
  progressValue?: number;
  actions?: ReactNode;
};

export function ExerciseProgressHeader({
  current,
  total,
  progressLabel,
  scoreLabel,
  hint,
  progressValue = 0,
  actions,
}: ExerciseProgressHeaderProps) {
  const hasCounts =
    typeof current === "number" && typeof total === "number" && total > 0;
  const safeTotal = hasCounts ? total : 0;
  const safeCurrent = hasCounts
    ? Math.min(Math.max(current, 0), safeTotal)
    : 0;
  const fallbackPercent = Math.min(100, Math.max(0, progressValue));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 sm:gap-4">
        <p
          className="shrink-0 font-mono text-sm tabular-nums text-ink sm:text-[0.9375rem]"
          aria-label={progressLabel}
        >
          {hasCounts ? (
            <>
              <span className="font-semibold">{safeCurrent}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{safeTotal}</span>
            </>
          ) : (
            progressLabel
          )}
        </p>

        {hasCounts ? (
          <div
            className="flex h-1.5 min-w-0 flex-1 items-stretch gap-px sm:h-2 sm:gap-0.5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={safeTotal}
            aria-valuenow={safeCurrent}
            aria-label={progressLabel}
          >
            {Array.from({ length: safeTotal }, (_, index) => {
              const done = index < safeCurrent;
              const active = index === safeCurrent - 1;
              return (
                <span
                  key={index}
                  className={cn(
                    "min-w-0 flex-1 rounded-full transition-colors duration-200",
                    done
                      ? active
                        ? "bg-(--exercise-accent)"
                        : "bg-(--exercise-accent)/55"
                      : "bg-hairline-cloud/80",
                  )}
                />
              );
            })}
          </div>
        ) : (
          <div
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-hairline-cloud/80 sm:h-2"
            role="progressbar"
            aria-valuenow={Math.round(fallbackPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel}
          >
            <div
              className="h-full rounded-full bg-(--exercise-accent) transition-[width] duration-200"
              style={{ width: `${fallbackPercent}%` }}
            />
          </div>
        )}

        {actions ? (
          <div className="flex shrink-0 items-center">{actions}</div>
        ) : scoreLabel ? (
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-sm">
            {scoreLabel}
          </p>
        ) : null}
      </div>
      {hint ? (
        <p className="text-[0.7rem] text-muted-foreground wrap-break-word">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
