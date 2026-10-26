"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";

type ExerciseSetSubmitBarProps = {
  answeredCount: number;
  totalQuestionCount: number;
  unansweredCount: number;
  submitting?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
  onJumpToUnanswered?: () => void;
};

export function ExerciseSetSubmitBar({
  answeredCount,
  totalQuestionCount,
  unansweredCount,
  submitting = false,
  disabled = false,
  onSubmit,
  onJumpToUnanswered,
}: ExerciseSetSubmitBarProps) {
  const t = useTranslations("exercises.session");
  const tCommon = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmitClick = () => {
    if (submitting || disabled) return;
    if (unansweredCount > 0) {
      setConfirmOpen(true);
      return;
    }
    onSubmit();
  };

  const confirmSubmit = () => {
    setConfirmOpen(false);
    onSubmit();
  };

  return (
    <>
      <div
        data-scroll-top-clearance=""
        className={[
          "sticky bottom-0 z-20 overflow-hidden",
          // Bleed to studio-paper edges and cancel main pb so the bar sits flush.
          "-mx-[var(--studio-main-pad,1rem)]",
          "mb-[calc(-1*var(--studio-main-pb,1.5rem))]",
          // Match .studio-paper radius (--radius-lg), not the old 1rem corners.
          "rounded-b-[var(--radius-lg)]",
          "border-t border-hairline-cloud",
          "bg-[color-mix(in_oklab,var(--exercise-accent-soft)_42%,var(--surface-elevated))]",
          "px-[var(--studio-main-pad,1rem)] py-3",
          "backdrop-blur-sm supports-backdrop-filter:bg-[color-mix(in_oklab,var(--exercise-accent-soft)_32%,var(--surface-elevated)_88%)]",
        ].join(" ")}
      >
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            {t("answeredProgress", {
              answered: answeredCount,
              total: totalQuestionCount,
            })}
            {unansweredCount > 0 ? (
              <button
                type="button"
                className="ml-2 font-medium text-(--exercise-accent) underline-offset-4 hover:underline"
                onClick={onJumpToUnanswered}
              >
                {t("jumpToUnanswered")}
              </button>
            ) : null}
          </p>
          <Button
            type="button"
            onClick={handleSubmitClick}
            disabled={disabled || submitting || totalQuestionCount === 0}
            className="h-11 w-full bg-(--exercise-accent) text-background hover:opacity-90 sm:h-9 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submitSet")
            )}
          </Button>
        </div>
      </div>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("unansweredWarnTitle")}
        description={t("unansweredWarn", { count: unansweredCount })}
        confirmLabel={t("submitAnyway")}
        cancelLabel={tCommon("cancel")}
        pending={submitting}
        onConfirm={confirmSubmit}
        onCancel={onJumpToUnanswered}
      />
    </>
  );
}
