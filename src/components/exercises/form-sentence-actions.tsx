"use client";

import { ChevronRight, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormSentenceActionsProps = {
  hasFeedback: boolean;
  canSubmit: boolean;
  evaluating: boolean;
  hasProAccess: boolean;
  isLast: boolean;
  saved: boolean;
  saving: boolean;
  tryAgainLabel: string;
  onSubmit: () => void;
  onNext: () => void;
  onSave: () => void;
  onTryAgain: () => void;
};

export function FormSentenceActions({
  hasFeedback,
  canSubmit,
  evaluating,
  hasProAccess,
  isLast,
  saved,
  saving,
  tryAgainLabel,
  onSubmit,
  onNext,
  onSave,
  onTryAgain,
}: FormSentenceActionsProps) {
  const t = useTranslations("exercises.formSentence");

  return (
    <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-3 bg-background/90 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:bg-transparent sm:pt-2 sm:pb-0 sm:backdrop-blur-none">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
        {!hasFeedback ? (
          <Button
            type="button"
            size="lg"
            onClick={onSubmit}
            disabled={!canSubmit && hasProAccess}
            aria-disabled={!hasProAccess || undefined}
            className={cn(
              "h-12 w-full sm:h-11 sm:w-auto sm:min-w-52",
              !hasProAccess && lockedFeatureClassName,
            )}
          >
            {evaluating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {hasProAccess ? t("submit") : t("unlockSubmit")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              className="h-12 w-full sm:order-2 sm:h-11 sm:w-auto sm:min-w-52"
            >
              {isLast ? t("finish") : t("continue")}
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSave}
              disabled={saved || saving}
              className="h-11 w-full sm:order-1 sm:h-10 sm:w-auto"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saved ? t("saved") : t("saveExample")}
            </Button>
          </>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onTryAgain}
        className="text-muted-foreground"
      >
        <RotateCcw className="size-4" />
        {tryAgainLabel}
      </Button>
    </div>
  );
}
