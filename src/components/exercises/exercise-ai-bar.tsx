"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { ExerciseDifficultySelect } from "@/components/exercises/exercise-difficulty-select";
import { ExerciseAdditionalInstructions } from "@/components/exercises/exercise-additional-instructions";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";

type ExerciseAiBarProps = {
  generating: boolean;
  hasSession: boolean;
  difficulty: ExerciseDifficulty;
  disabled?: boolean;
  onDifficultyChange: (difficulty: ExerciseDifficulty) => void;
  onGenerate: () => void;
  additionalInstructions: string;
  onAdditionalInstructionsChange: (value: string) => void;
};

export function ExerciseAiBar({
  generating,
  hasSession,
  difficulty,
  disabled = false,
  onDifficultyChange,
  onGenerate,
  additionalInstructions,
  onAdditionalInstructionsChange,
}: ExerciseAiBarProps) {
  const t = useTranslations("exercises.ai");
  const exerciseQuota = useQuotaLockMessage("ai_exercise");

  return (
    <div className="exercise-panel flex flex-col gap-3 rounded-2xl border p-3 sm:p-4">
      <ExerciseAdditionalInstructions
        scope="vocabulary"
        value={additionalInstructions}
        onChange={onAdditionalInstructionsChange}
        settings={{ difficulty }}
        onSettingsChange={(next) => {
          if (next.difficulty) onDifficultyChange(next.difficulty);
        }}
        disabled={generating}
      />
      <ExerciseDifficultySelect
        value={difficulty}
        onChange={onDifficultyChange}
        disabled={generating || exerciseQuota.locked}
        compact
      />

      <div className="flex flex-1 flex-col gap-2 sm:items-end">
        <QuotaLockButton
          type="button"
          size="sm"
          locked={exerciseQuota.locked}
          lockMessage={exerciseQuota.message}
          pending={generating}
          disabled={disabled}
          icon={<Sparkles className="size-3.5" />}
          onClick={onGenerate}
        >
          {generating
            ? t("generating")
            : hasSession
              ? t("generateMore")
              : t("generate")}
        </QuotaLockButton>
      </div>
    </div>
  );
}
