"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Eye, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimedHint } from "@/hooks/use-timed-hint";

type ExerciseHintProps = {
  resetKey: string;
  answered: boolean;
  correctAnswer?: string;
  onRevealAnswer?: () => void;
  children: ReactNode;
};

export function ExerciseHint({
  resetKey,
  answered,
  correctAnswer,
  onRevealAnswer,
  children,
}: ExerciseHintProps) {
  return (
    <ExerciseHintInner
      key={resetKey}
      answered={answered}
      correctAnswer={correctAnswer}
      onRevealAnswer={onRevealAnswer}
    >
      {children}
    </ExerciseHintInner>
  );
}

function ExerciseHintInner({
  answered,
  correctAnswer,
  onRevealAnswer,
  children,
}: {
  answered: boolean;
  correctAnswer?: string;
  onRevealAnswer?: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("exercises.timedHint");
  const { secondsLeft, hintVisible, canRevealAnswer, showNow } =
    useTimedHint(answered);

  if (answered && !hintVisible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-hairline-cloud bg-muted/25 px-4 py-3 sm:px-5 sm:py-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-accent-violet-mid" />
      <div className="min-w-0 flex-1 space-y-3">
        {hintVisible ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("label")}
            </p>
            <div className="mt-1 text-sm text-ink sm:text-base">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm text-ink sm:text-base" aria-live="polite">
              {t("availableIn", { seconds: secondsLeft })}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={showNow}
              className="h-auto shrink-0 justify-start px-0 text-accent-violet-mid hover:bg-transparent hover:text-accent-violet-mid sm:justify-center"
            >
              {t("showNow")}
            </Button>
          </div>
        )}

        {canRevealAnswer && correctAnswer && onRevealAnswer ? (
          <div className="flex flex-col gap-2 border-t border-hairline-cloud pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("revealPrompt")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRevealAnswer}
              className="h-9 shrink-0"
            >
              <Eye className="size-4" />
              {t("revealAnswer")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
