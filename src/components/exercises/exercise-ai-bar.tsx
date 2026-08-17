"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProUpgradeDialog } from "@/components/billing/pro-upgrade-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXERCISE_AI_CEFR_LEVELS,
  type ExerciseAiCefr,
} from "@/lib/exercises/ai-types";

type ExerciseAiBarProps = {
  canUseAi: boolean;
  generating: boolean;
  hasSession: boolean;
  level: ExerciseAiCefr;
  upgradeOpen: boolean;
  disabled?: boolean;
  onLevelChange: (level: ExerciseAiCefr) => void;
  onGenerate: () => void;
  onUpgradeOpenChange: (open: boolean) => void;
};

export function ExerciseAiBar({
  canUseAi,
  generating,
  hasSession,
  level,
  upgradeOpen,
  disabled = false,
  onLevelChange,
  onGenerate,
  onUpgradeOpenChange,
}: ExerciseAiBarProps) {
  const t = useTranslations("exercises.ai");
  const tMeta = useTranslations("writing.meta");

  function handleGenerate() {
    if (!canUseAi) {
      onUpgradeOpenChange(true);
      return;
    }
    onGenerate();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-hairline-cloud bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
      <div className="space-y-2 sm:w-40">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("levelLabel")}
        </p>
        <Select
          value={level}
          onValueChange={(value) => {
            if (value) onLevelChange(value as ExerciseAiCefr);
          }}
          disabled={generating}
        >
          <SelectTrigger className="h-10 w-full cursor-pointer sm:h-8">
            <SelectValue>{tMeta(`cefr.${level}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {EXERCISE_AI_CEFR_LEVELS.map((item) => (
              <SelectItem key={item} value={item}>
                {tMeta(`cefr.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:items-end">
        <Button
          type="button"
          size="sm"
          disabled={generating || disabled}
          onClick={handleGenerate}
        >
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : canUseAi ? (
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
        {!canUseAi ? (
          <p className="text-xs text-muted-foreground">{t("upgradeHint")}</p>
        ) : null}
      </div>

      <ProUpgradeDialog open={upgradeOpen} onOpenChange={onUpgradeOpenChange} />
    </div>
  );
}
