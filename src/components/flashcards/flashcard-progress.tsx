"use client";

import { RotateCcw, Shuffle } from "lucide-react";
import { ExerciseProgressHeader } from "@/components/exercises/exercise-progress-header";
import { Button } from "@/components/ui/button";

type FlashcardProgressProps = {
  current: number;
  total: number;
  progressLabel: string;
  shuffleLabel: string;
  restartLabel: string;
  onShuffle: () => void;
  onRestart: () => void;
};

export function FlashcardProgress({
  current,
  total,
  progressLabel,
  shuffleLabel,
  restartLabel,
  onShuffle,
  onRestart,
}: FlashcardProgressProps) {
  return (
    <ExerciseProgressHeader
      current={current}
      total={total}
      progressLabel={progressLabel}
      actions={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShuffle}
            className="text-muted-foreground"
            aria-label={shuffleLabel}
          >
            <Shuffle className="size-3.5" />
            <span className="hidden sm:inline">{shuffleLabel}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRestart}
            className="text-muted-foreground"
            aria-label={restartLabel}
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">{restartLabel}</span>
          </Button>
        </>
      }
    />
  );
}
