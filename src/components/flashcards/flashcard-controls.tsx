"use client";

import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="size-4" />
          {t("previous")}
        </Button>

        <Button type="button" variant="secondary" size="sm" onClick={onFlip}>
          <RotateCw className="size-4" />
          {isFlipped ? t("hideAnswer") : t("flip")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
        >
          {t("next")}
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onShuffle}>
          <Shuffle className="size-4" />
          {t("shuffle")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRestart}>
          {t("restart")}
        </Button>
      </div>
    </div>
  );
}
