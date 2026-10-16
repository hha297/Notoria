"use client";

import { useTranslations } from "next-intl";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { partialAnswerHint } from "@/lib/exercises/hint";

type ExerciseSetPartialHintProps = {
  answer: string;
  resetKey: string;
  answered: boolean;
  /** Optional full-answer reveal after the timed hint (single-card mode). */
  onRevealAnswer?: () => void;
};

/**
 * Timed partial surface-form hint (30s or “Show hint now”).
 * Used for fill-blank / type-answer across vocab, theory, and import.
 */
export function ExerciseSetPartialHint({
  answer,
  resetKey,
  answered,
  onRevealAnswer,
}: ExerciseSetPartialHintProps) {
  const t = useTranslations("exercises.session");
  const mask = partialAnswerHint(answer);
  if (!mask) return null;

  return (
    <div className="mt-6 sm:mt-8">
      <ExerciseHint
        resetKey={resetKey}
        answered={answered}
        correctAnswer={onRevealAnswer ? answer : undefined}
        onRevealAnswer={onRevealAnswer}
      >
        <span className="font-mono tracking-wide">
          {t("partialHint", { mask })}
        </span>
      </ExerciseHint>
    </div>
  );
}
