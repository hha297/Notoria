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
import { Input } from "@/components/ui/input";
import { answersMatchAny, revealTextForExercise } from "@/lib/theory-exercises/generate-ai";
import type { TheoryTransformationExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

export function TheoryTransformationCard({
  item,
  onResolved,
  onNext,
}: {
  item: TheoryTransformationExercise;
  onResolved: (correct: boolean) => void;
  onNext: () => void;
}) {
  const t = useTranslations("exercises.theory");
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && answersMatchAny(value, item.acceptedAnswers);
  const revealDisplay = revealTextForExercise(item);

  const check = () => {
    if (checked || !value.trim()) return;
    setChecked(true);
    onResolved(answersMatchAny(value, item.acceptedAnswers));
  };

  const revealAnswer = () => {
    if (checked) return;
    setPeeked(true);
    setChecked(true);
    setValue(item.answer);
    onResolved(false);
  };

  return (
    <div className="rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <SkillHeader
        skillLabel={item.skillLabel}
        instruction={item.instruction}
        fallbackType={t("types.transformation")}
        fallbackInstruction={
          item.showArrow === false
            ? t("instructions.completeExercise")
            : t("instructions.applyRule")
        }
      />
      <p className="font-heading text-2xl font-medium tracking-tight text-ink sm:text-3xl">
        {item.showArrow !== false ? (
          <>
            {item.promptWord} →{" "}
            {checked ? (
              <span
                className={cn(
                  "border-b-2 font-semibold",
                  isCorrect
                    ? "border-[#b8d96a] text-[#4a6b0a]"
                    : "border-destructive/50 text-destructive",
                )}
              >
                {isCorrect ? value.trim() : item.answer}
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-block min-w-[7ch] translate-y-[-0.08em] border-b-2 border-dashed border-muted-foreground/55"
              />
            )}
          </>
        ) : (
          <>
            <span>{item.promptWord}: </span>
            {checked ? (
              <span
                className={cn(
                  "border-b-2 font-semibold",
                  isCorrect
                    ? "border-[#b8d96a] text-[#4a6b0a]"
                    : "border-destructive/50 text-destructive",
                )}
              >
                {isCorrect ? value.trim() : item.answer}
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-block min-w-[7ch] translate-y-[-0.08em] border-b-2 border-dashed border-muted-foreground/55"
              />
            )}
          </>
        )}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={checked}
          placeholder={t("fillPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (checked) onNext();
              else check();
            }
          }}
          className="sm:flex-1"
          autoFocus
        />
        {!checked ? (
          <Button type="button" onClick={check} disabled={!value.trim()}>
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
