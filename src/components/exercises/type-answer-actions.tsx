"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type TypeAnswerActionsProps = {
  canPrev: boolean;
  revealed: boolean;
  canCheck: boolean;
  isLast: boolean;
  tryAgainLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onCheck: () => void;
  onTryAgain: () => void;
};

export function TypeAnswerActions({
  canPrev,
  revealed,
  canCheck,
  isLast,
  tryAgainLabel,
  onPrev,
  onNext,
  onCheck,
  onTryAgain,
}: TypeAnswerActionsProps) {
  const t = useTranslations("exercises.typeAnswer");

  return (
    <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-3 bg-background/90 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:bg-transparent sm:pt-2 sm:pb-0 sm:backdrop-blur-none">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
        <Button
          type="button"
          size="lg"
          onClick={revealed ? onNext : onCheck}
          disabled={!revealed && !canCheck}
          className="h-12 w-full sm:order-2 sm:h-11 sm:w-auto sm:min-w-52"
        >
          {revealed ? (
            <>
              {isLast ? t("finish") : t("next")}
              <ChevronRight className="size-4" />
            </>
          ) : (
            t("check")
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onPrev}
          disabled={!canPrev}
          className="h-11 text-muted-foreground sm:order-1 sm:h-10 sm:flex-none"
        >
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>
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
