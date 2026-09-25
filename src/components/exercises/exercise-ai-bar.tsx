"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { Button } from "@/components/ui/button";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";

type ExerciseAiBarProps = {
  generating: boolean;
  hasSession: boolean;
  difficulty: ExerciseDifficulty;
  disabled?: boolean;
  onDifficultyChange: (difficulty: ExerciseDifficulty) => void;
  onGenerate: () => void;
};

export function ExerciseAiBar({
  generating,
  hasSession,
  difficulty,
  disabled = false,
  onDifficultyChange,
  onGenerate,
}: ExerciseAiBarProps) {
  const t = useTranslations("exercises.ai");

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-hairline-cloud bg-surface-elevated p-3 sm:p-4">
      <ExerciseDifficultySelect
        value={difficulty}
        onChange={onDifficultyChange}
        disabled={generating}
        compact
      />

      <div className="flex flex-1 flex-col gap-2 sm:items-end">
        <Button
          type="button"
          size="sm"
          disabled={generating || disabled}
          onClick={onGenerate}
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {generating
            ? t("generating")
            : hasSession
              ? t("generateMore")
              : t("generate")}
        </Button>
      </div>
    </div>
  );
}
