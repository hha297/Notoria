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
  keyHint: string;
  tone: "again" | "hard" | "good" | "easy";
}> = [
  { rating: "AGAIN", keyHint: "1", tone: "again" },
  { rating: "HARD", keyHint: "2", tone: "hard" },
  { rating: "GOOD", keyHint: "3", tone: "good" },
  { rating: "EASY", keyHint: "4", tone: "easy" },
];

const TONE_CLASS: Record<(typeof RATING_OPTIONS)[number]["tone"], string> = {
  again:
    "border-error/25 text-error hover:border-error hover:bg-error-muted",
  hard: "border-warning/30 text-warning hover:border-warning hover:bg-warning/10",
  good: "border-transparent",
  easy: "border-success/30 text-success hover:border-success hover:bg-success-muted",
};

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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {RATING_OPTIONS.map(({ rating, keyHint, tone }) => {
          const isPrimary = tone === "good";
          return (
            <Button
              key={rating}
              type="button"
              variant={isPrimary ? "default" : "outline"}
              disabled={isSubmitting}
              onClick={() => onRate(rating)}
              className={cn(
                "h-12 flex-col gap-0 rounded-md py-0 sm:h-[3.25rem]",
                TONE_CLASS[tone],
              )}
            >
              <span className="text-sm font-semibold sm:text-[0.9375rem]">
                {t(`ratings.${rating}`)}
              </span>
              <span
                className={cn(
                  "hidden font-mono text-[0.65rem] font-medium tracking-wide uppercase sm:block",
                  isPrimary ? "text-on-primary/70" : "opacity-70",
                )}
              >
                {keyHint} · {t(`ratingHints.${rating}`)}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
