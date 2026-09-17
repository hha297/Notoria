"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  EXERCISE_DIFFICULTIES,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";
import { cn } from "@/lib/utils";

type ExerciseDifficultySelectProps = {
  value: ExerciseDifficulty;
  onChange: (value: ExerciseDifficulty) => void;
  disabled?: boolean;
  className?: string;
  /** Compact single-row layout for narrow headers. */
  compact?: boolean;
};

export function ExerciseDifficultySelect({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}: ExerciseDifficultySelectProps) {
  const t = useTranslations("exercises.difficulty");
  const labelId = useId();

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <p
        id={labelId}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t("label")}
      </p>
      <ToggleGroup
        value={[value]}
        onValueChange={(next) => {
          const picked = next[0] as ExerciseDifficulty | undefined;
          if (picked) onChange(picked);
        }}
        disabled={disabled}
        aria-labelledby={labelId}
        className={cn(
          "flex w-full min-w-0 gap-1.5 sm:gap-2",
          compact ? "flex-wrap" : "flex-col sm:flex-row sm:flex-wrap",
        )}
      >
        {EXERCISE_DIFFICULTIES.map((level) => (
          <ToggleGroupItem
            key={level}
            value={level}
            className="min-w-0 flex-1 cursor-pointer px-2 text-xs sm:flex-none sm:px-3.5 sm:text-sm"
            aria-label={t(level)}
          >
            {t(level)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
