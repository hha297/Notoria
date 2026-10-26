"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type ExerciseOneByOneBarProps = {
  checked: boolean;
  isLast: boolean;
  canCheck: boolean;
  submitting?: boolean;
  onCheck: () => void;
  onNext: () => void;
  onViewResults: () => void;
};

export function ExerciseOneByOneBar({
  checked,
  isLast,
  canCheck,
  submitting = false,
  onCheck,
  onNext,
  onViewResults,
}: ExerciseOneByOneBarProps) {
  const t = useTranslations("exercises.session");

  return (
    <div
      data-scroll-top-clearance=""
      className={[
        "sticky bottom-0 z-20",
        "-mx-[var(--studio-main-pad,1rem)]",
        "mb-[calc(-1*var(--studio-main-pb,1.5rem))]",
        "rounded-b-[1rem]",
        "border-t border-hairline-cloud",
        "bg-[color-mix(in_oklab,var(--exercise-accent-soft)_42%,var(--surface-elevated))]",
        "px-[var(--studio-main-pad,1rem)] py-3",
        "backdrop-blur-sm supports-backdrop-filter:bg-[color-mix(in_oklab,var(--exercise-accent-soft)_32%,var(--surface-elevated)_88%)]",
      ].join(" ")}
    >
      <div className="flex w-full justify-end">
        {!checked ? (
          <Button
            type="button"
            onClick={onCheck}
            disabled={!canCheck || submitting}
            className="h-11 w-full bg-(--exercise-accent) text-background hover:opacity-90 sm:h-9 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("checkAnswer")
            )}
          </Button>
        ) : isLast ? (
          <Button
            type="button"
            onClick={onViewResults}
            className="h-11 w-full bg-(--exercise-accent) text-background hover:opacity-90 sm:h-9 sm:w-auto"
          >
            {t("viewResults")}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            className="h-11 w-full bg-(--exercise-accent) text-background hover:opacity-90 sm:h-9 sm:w-auto"
          >
            {t("nextQuestion")}
          </Button>
        )}
      </div>
    </div>
  );
}
