"use client";

import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type FlashcardControlsProps = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isFlipped: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
};

export function FlashcardControls({
  canGoPrevious,
  canGoNext,
  isFlipped,
  onPrevious,
  onNext,
  onFlip,
}: FlashcardControlsProps) {
  const t = useTranslations("flashcards");

  if (isFlipped) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="min-h-11 text-muted-foreground sm:min-h-10"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onFlip}
          className="text-muted-foreground"
        >
          <EyeOff className="size-4" />
          {t("hideAnswer")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onNext}
          disabled={!canGoNext}
          className="min-h-11 text-muted-foreground sm:min-h-10"
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between">
      <Button
        type="button"
        size="lg"
        onClick={onFlip}
        className="col-span-2 h-12 min-w-0 sm:order-2 sm:col-span-1 sm:h-11 sm:w-auto sm:min-w-48 sm:flex-none"
      >
        <Eye className="size-4" />
        {t("showAnswer")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="h-11 text-muted-foreground sm:order-1 sm:h-10 sm:flex-none"
      >
        <ChevronLeft className="size-4" />
        {t("previous")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onNext}
        disabled={!canGoNext}
        className="h-11 text-muted-foreground sm:order-3 sm:h-10 sm:flex-none"
      >
        {t("next")}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
