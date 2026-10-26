"use client";

import { useTranslations } from "next-intl";
import type { ExerciseDisplayMode } from "@/lib/exercises/display-mode";
import { cn } from "@/lib/utils";

type ExerciseDisplayModePickerProps = {
  value: ExerciseDisplayMode;
  onChange: (mode: ExerciseDisplayMode) => void;
  disabled?: boolean;
  className?: string;
};

const OPTIONS: ExerciseDisplayMode[] = ["one_by_one", "all_questions"];

/**
 * Two direct choices for how the set is shown. Disabled once answering starts
 * so mid-set switches don't wipe in-progress answers.
 */
export function ExerciseDisplayModePicker({
  value,
  onChange,
  disabled = false,
  className,
}: ExerciseDisplayModePickerProps) {
  const t = useTranslations("exercises.session.displayMode");

  return (
    <fieldset
      className={cn("min-w-0", className)}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      <legend className="text-[0.68rem] font-semibold tracking-[0.16em] text-(--exercise-accent) uppercase">
        {t("label")}
      </legend>
      <div
        className="mt-2 grid gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label={t("label")}
      >
        {OPTIONS.map((mode) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={cn(
                "rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]",
                selected
                  ? "border-(--exercise-accent) bg-(--exercise-accent-soft)/70 shadow-[inset_0_0_0_1px_var(--exercise-accent)]"
                  : "border-hairline-cloud bg-surface hover:border-(--exercise-accent)/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="block font-heading text-sm font-semibold text-ink">
                {t(`${mode}.title`)}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t(`${mode}.description`)}
              </span>
            </button>
          );
        })}
      </div>
      {disabled ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("lockedHint")}</p>
      ) : null}
    </fieldset>
  );
}
