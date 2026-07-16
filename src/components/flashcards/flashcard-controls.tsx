"use client";

import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FlashcardControlsProps = {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isFlipped: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
  onShuffle: () => void;
  onRestart: () => void;
};

export function FlashcardControls({
  canGoPrevious,
  canGoNext,
  isFlipped,
  onPrevious,
  onNext,
  onFlip,
  onShuffle,
  onRestart,
}: FlashcardControlsProps) {
  const t = useTranslations("flashcards");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="min-w-30"
        >
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onFlip}
          className="min-w-30 font-semibold"
        >
          <RotateCw className="size-4" />
          {isFlipped ? t("hideAnswer") : t("flip")}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onNext}
          disabled={!canGoNext}
          className="min-w-30"
        >
          {t("next")}
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div
        className={cn(
          "grid w-full grid-cols-1 gap-2.5 rounded-xl border border-hairline-cloud bg-muted/40 p-3 sm:grid-cols-2",
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={onShuffle}
          className="h-10 gap-2 px-4 text-sm"
        >
          <Shuffle className="size-4" />
          {t("shuffle")}
        </Button>
        <Button
          type="button"
          onClick={onRestart}
          className="h-10 gap-2 border-transparent bg-accent-lime px-4 text-sm font-bold text-ink hover:bg-accent-lime/90"
        >
          <RotateCcw className="size-4" />
          {t("restart")}
        </Button>
      </div>
    </div>
  );
}
