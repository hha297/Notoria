"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { Button } from "@/components/ui/button";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";
import { cn } from "@/lib/utils";

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
  const { hasProAccess, openUpgrade } = useProAccess();

  function handleGenerate() {
    if (!hasProAccess) {
      openUpgrade();
      return;
    }
    onGenerate();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline-cloud bg-card p-3 sm:p-4">
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
          aria-disabled={!hasProAccess || undefined}
          disabled={hasProAccess && (generating || disabled)}
          className={cn(!hasProAccess && lockedFeatureClassName)}
          onClick={handleGenerate}
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : hasProAccess ? (
            <Sparkles className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
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
