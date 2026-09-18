"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FlashcardRating } from "@/types/flashcards";

type FlashcardRatingBarProps = {
  onRate: (rating: FlashcardRating) => void;
  isSubmitting: boolean;
};

const RATING_OPTIONS: Array<{
  rating: FlashcardRating;
  buttonClassName: string;
  labelClassName: string;
  hintClassName: string;
}> = [
    {
      rating: "AGAIN",
      buttonClassName:
        "border-error-border bg-error-muted hover:border-error hover:bg-error-muted hover:text-error",
      labelClassName: "text-error",
      hintClassName: "text-error/75",
    },
    {
      rating: "HARD",
      buttonClassName:
        "border-warning/40 bg-warning/10 hover:border-warning hover:bg-warning/15 hover:text-warning",
      labelClassName: "text-warning",
      hintClassName: "text-warning/80",
    },
    {
      rating: "GOOD",
      buttonClassName:
        "border-success-border bg-success-muted hover:border-success hover:bg-success-muted hover:text-success",
      labelClassName: "text-success",
      hintClassName: "text-success/80",
    },
    {
      rating: "EASY",
      buttonClassName:
        "border-primary/40 bg-surface-active hover:border-primary hover:bg-surface-active hover:text-primary",
      labelClassName: "text-primary",
      hintClassName: "text-primary/80",
    },
  ];

export function FlashcardRatingBar({
  onRate,
  isSubmitting,
}: FlashcardRatingBarProps) {
  const t = useTranslations("flashcards");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        {t("ratePrompt")}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {RATING_OPTIONS.map(
          ({ rating, buttonClassName, labelClassName, hintClassName }) => (
            <Button
              key={rating}
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onRate(rating)}
              className={cn(
                "h-auto cursor-pointer flex-col gap-1 rounded-sm py-3.5 normal-case tracking-normal",
                buttonClassName,
              )}
            >
              <span className={cn("text-sm font-semibold", labelClassName)}>
                {t(`ratings.${rating}`)}
              </span>
              <span className={cn("text-xs font-medium", hintClassName)}>
                {t(`ratingHints.${rating}`)}
              </span>
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
