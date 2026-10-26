"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { FillBlankSource } from "@/lib/exercises/fill-blank";
import { cn } from "@/lib/utils";

type FillBlankSourcePickerProps = {
  value: FillBlankSource;
  onChange: (source: FillBlankSource) => void;
  /** Hide or lock AI when the learner is not on Pro. */
  aiLocked?: boolean;
  disabled?: boolean;
  className?: string;
};

const OPTIONS: FillBlankSource[] = ["saved-examples", "ai-generated"];

/**
 * Choose whether Fill in the Blank builds from saved vocabulary examples
 * (instant, no AI) or from AI-generated sentences.
 */
export function FillBlankSourcePicker({
  value,
  onChange,
  aiLocked = false,
  disabled = false,
  className,
}: FillBlankSourcePickerProps) {
  const t = useTranslations("exercises.fillInBlank.source");
  const tBilling = useTranslations("billing");

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
        {OPTIONS.map((source) => {
          const selected = value === source;
          const locked = source === "ai-generated" && aiLocked;
          return (
            <button
              key={source}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || locked}
              onClick={() => {
                if (!locked) onChange(source);
              }}
              className={cn(
                "rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]",
                selected
                  ? "border-(--exercise-accent) bg-(--exercise-accent-soft) shadow-[inset_0_0_0_1px_var(--exercise-accent)]"
                  : "exercise-panel hover:border-(--exercise-accent)/40 hover:bg-(--page-accent-hover)",
                (disabled || locked) && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ink">
                {t(`${source}.title`)}
                {source === "ai-generated" && aiLocked ? (
                  <Badge
                    variant="pro"
                    className="px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide"
                  >
                    {tBilling("proBadge")}
                  </Badge>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t(`${source}.description`)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
