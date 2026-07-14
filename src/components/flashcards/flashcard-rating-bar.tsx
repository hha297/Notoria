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
      "border-[#f3b8cc] bg-[#fff1f6] hover:border-[#e892ad] hover:bg-[#ffe4ef] hover:text-[#a8325c] shadow-sm shadow-[#fa7faa]/10",
    labelClassName: "text-[#c7366a]",
    hintClassName: "text-[#d64580]/75",
  },
  {
    rating: "HARD",
    buttonClassName:
      "border-[#f0c987] bg-[#fff8eb] hover:border-[#e5b56a] hover:bg-[#fef0d4] hover:text-[#9a4f07] shadow-sm shadow-amber-500/10",
    labelClassName: "text-[#b45309]",
    hintClassName: "text-[#c76a0f]/80",
  },
  {
    rating: "GOOD",
    buttonClassName:
      "border-[#b8d96a] bg-[#f4fae0] hover:border-[#8ebd18] hover:bg-[#eaf5c4] hover:text-[#3d5c08] shadow-sm shadow-[#8ebd18]/15",
    labelClassName: "text-[#4a6b0a]",
    hintClassName: "text-[#5c7d12]/80",
  },
  {
    rating: "EASY",
    buttonClassName:
      "border-[#a8c8f0] bg-[#eef5ff] hover:border-[#7eb3f0] hover:bg-[#dfefff] hover:text-[#1a4f8c] shadow-sm shadow-sky-500/10",
    labelClassName: "text-[#1e5a9e]",
    hintClassName: "text-[#2d6cb0]/80",
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
                "h-auto cursor-pointer flex-col gap-1 rounded-xl py-3.5 normal-case tracking-normal",
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
