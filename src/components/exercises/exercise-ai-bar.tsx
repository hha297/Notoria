"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  generating: boolean;
  hasSession: boolean;
  level: ExerciseAiCefr;
  disabled?: boolean;
  onLevelChange: (level: ExerciseAiCefr) => void;
  onGenerate: () => void;
};

export function ExerciseAiBar({
  generating,
  hasSession,
  level,
  disabled = false,
  onLevelChange,
  onGenerate,
}: ExerciseAiBarProps) {
  const t = useTranslations("exercises.ai");
  const tMeta = useTranslations("writing.meta");
  const { hasProAccess, openUpgrade } = useProAccess();

  function handleGenerate() {
    if (!hasProAccess) {
      openUpgrade();
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
