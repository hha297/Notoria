"use client";

type ExerciseProgressHeaderProps = {
  current?: number;
  total?: number;
  progressLabel: string;
  scoreLabel?: string;
  hint?: string;
  progressValue: number;
};

function padCount(value: number) {
  return String(value).padStart(2, "0");
}

export function ExerciseProgressHeader({
  current,
  total,
  progressLabel,
  scoreLabel,
  hint,
  progressValue,
}: ExerciseProgressHeaderProps) {
  const hasCounts =
    typeof current === "number" && typeof total === "number" && total > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p
          className="font-mono text-lg leading-none tabular-nums text-(--exercise-accent) sm:text-xl"
          aria-label={progressLabel}
        >
          {hasCounts ? (
            <>
              {padCount(current)}
              <span className="mx-1.5 text-muted-foreground">/</span>
              {padCount(total)}
            </>
          ) : (
            progressLabel
          )}
        </p>
        {scoreLabel ? (
          <p className="text-sm text-muted-foreground">{scoreLabel}</p>
        ) : null}
      </div>
      <div
        className="h-px overflow-hidden bg-hairline-cloud"
        role="progressbar"
        aria-valuenow={Math.round(progressValue)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-(--exercise-accent) transition-[width] duration-200"
          style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
        />
      </div>
      {hint ? (
        <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
