"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FeedbackRow,
  HintText,
  SkillHeader,
} from "@/components/exercises/theory/theory-card-shared";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import { revealTextForExercise } from "@/lib/theory-exercises/generate-ai";
import type { TheoryMultipleChoiceExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

export function TheoryMultipleChoiceCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryMultipleChoiceExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && selected === item.correctOption;
  const revealDisplay = revealTextForExercise(item);

  const check = () => {
    if (checked || !selected) return;
    setChecked(true);
    onResolved(selected === item.correctOption);
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setSelected(item.correctOption);
    onResolved(false);
  };

  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction}
        fallbackType={t("types.multiple_choice")}
        fallbackInstruction={t("instructions.chooseForm")}
      />
      <p className="break-words font-heading text-xl font-medium leading-snug text-ink [overflow-wrap:anywhere]">
        {item.prompt}
      </p>
      <div className="mt-5 grid min-w-0 gap-2">
        {item.options.map((option) => {
          const isSelected = selected === option;
          const showState = checked && isSelected;
          return (
            <button
              key={option}
              type="button"
              disabled={checked}
              onClick={() => setSelected(option)}
              className={cn(
                "min-w-0 rounded-xl border px-4 py-3 text-left text-sm font-medium break-words [overflow-wrap:anywhere] transition-colors",
                isSelected && !checked && "border-ink bg-muted/40",
                showState && isCorrect && "border-[#b8d96a] bg-[#f4fae0] text-[#4a6b0a]",
                showState && !isCorrect && "border-destructive/40 bg-[#fff1f6] text-destructive",
                !isSelected && "border-hairline-cloud hover:bg-muted/30",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!checked ? (
          <Button type="button" onClick={check} disabled={!selected}>
            {t("check")}
          </Button>
        ) : null}
      </div>
      <div className="mt-4">
        <ExerciseHint
          resetKey={item.id}
          answered={checked}
          correctAnswer={revealDisplay}
          onRevealAnswer={revealAnswer}
        >
          <HintText text={item.hint} />
        </ExerciseHint>
      </div>
      {checked ? (
        <>
          <FeedbackRow
            correct={isCorrect}
            message={
              isCorrect
                ? t("feedback.correct")
                : t("feedback.incorrectWithAnswer", { answer: revealDisplay })
            }
            onNext={onNext}
            nextLabel={t("next")}
          />
          {item.explanation ? (
            <p className="mt-3 text-sm text-muted-foreground">{item.explanation}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
