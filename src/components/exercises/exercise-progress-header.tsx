"use client";

import { Progress } from "@/components/ui/progress";

type ExerciseProgressHeaderProps = {
  progressLabel: string;
  scoreLabel?: string;
  hint?: string;
  progressValue: number;
};

export function ExerciseProgressHeader({
  progressLabel,
  scoreLabel,
  hint,
  progressValue,
}: ExerciseProgressHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="font-medium text-ink">{progressLabel}</p>
        {scoreLabel && <p className="text-muted-foreground">{scoreLabel}</p>}
      </div>
      <Progress value={progressValue} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
