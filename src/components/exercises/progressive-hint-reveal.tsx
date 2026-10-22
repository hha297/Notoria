"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import { resolveProgressiveHints } from "@/lib/exercises/progressive-hints";

type ProgressiveHintRevealProps = {
  hints?: readonly string[] | null;
  legacyHint?: string | null;
  grounding?: string | null;
  answers?: readonly string[];
  difficulty?: string | null;
  submittedMistake?: string | null;
  resetKey: string;
  answered: boolean;
  correctAnswer?: string;
  onRevealAnswer?: () => void;
};

/**
 * Reveals pre-generated hints one at a time. No model call.
 */
export function ProgressiveHintReveal({
  hints,
  legacyHint,
  grounding,
  answers = [],
  difficulty,
  submittedMistake,
  resetKey,
  answered,
  correctAnswer,
  onRevealAnswer,
}: ProgressiveHintRevealProps) {
  const resolved = resolveProgressiveHints({
    raw: hints,
    legacyHint,
    grounding,
    answers,
    difficulty,
    submittedMistake,
  });
  if (resolved.length === 0 || answered) return null;

  return (
    <ProgressiveHintRevealInner
      key={resetKey}
      hints={resolved}
      answered={answered}
      correctAnswer={correctAnswer}
      onRevealAnswer={onRevealAnswer}
    />
  );
}

function ProgressiveHintRevealInner({
  hints,
  answered,
  correctAnswer,
  onRevealAnswer,
}: {
  hints: string[];
  answered: boolean;
  correctAnswer?: string;
  onRevealAnswer?: () => void;
}) {
  const t = useTranslations("exercises.timedHint");
  const [shown, setShown] = useState(1);
  const visible = hints.slice(0, shown);

  return (
    <div className="mt-6 sm:mt-8">
      <ExerciseHint
        resetKey="visible"
        answered={answered}
        correctAnswer={correctAnswer}
        onRevealAnswer={onRevealAnswer}
      >
        <ol className="space-y-2">
          {visible.map((hint, index) => (
            <li key={`${index}-${hint}`} className="wrap-anywhere">
              <span className="mr-2 text-xs font-semibold text-muted-foreground">
                {t("hintProgress", { current: index + 1, total: hints.length })}
              </span>
              {hint}
            </li>
          ))}
        </ol>
        {shown < hints.length ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-auto px-0 text-muted-foreground hover:bg-transparent hover:text-ink"
            onClick={() => setShown((count) => Math.min(hints.length, count + 1))}
          >
            {t("nextHint")}
          </Button>
        ) : null}
      </ExerciseHint>
    </div>
  );
}
