"use client";

import { useTranslations } from "next-intl";
import type { TheoryQuestionType } from "@/lib/theory-exercises/question-type";
import { cn } from "@/lib/utils";

type TheoryQuestionTypePickerProps = {
  value: TheoryQuestionType;
  onChange: (value: TheoryQuestionType) => void;
  disabled?: boolean;
  label: string;
  className?: string;
};

const OPTIONS: TheoryQuestionType[] = ["fill_blank", "multiple_choice"];

export function TheoryQuestionTypePicker({
  value,
  onChange,
  disabled = false,
  label,
  className,
}: TheoryQuestionTypePickerProps) {
  const t = useTranslations("exercises.types");
  const tOptions = useTranslations("exercises.questionTypeOptions");

  return (
    <fieldset
      className={cn("min-w-0", className)}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      <legend className="text-[0.68rem] font-semibold tracking-[0.16em] text-(--exercise-accent) uppercase">
        {label}
      </legend>
      <div
        className="mt-1.5 grid gap-1.5 sm:mt-2 sm:grid-cols-2 sm:gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {OPTIONS.map((option) => {
          const selected = value === option;
          const key =
            option === "multiple_choice" ? "multiple-choice" : "fill-in-blank";

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] sm:px-3.5 sm:py-3",
                selected
                  ? "border-(--exercise-accent) bg-(--exercise-accent-soft) shadow-[inset_0_0_0_1px_var(--exercise-accent)]"
                  : "exercise-panel hover:border-(--exercise-accent)/40 hover:bg-(--page-accent-hover)",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="block font-heading text-sm font-semibold text-ink">
                {t(`${key}.label`)}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground sm:mt-1 sm:leading-relaxed">
                {tOptions(option)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
