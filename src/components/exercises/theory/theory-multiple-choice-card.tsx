"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { HintText } from "@/components/exercises/theory/theory-card-shared";
import { TheoryPracticeFeedback } from "@/components/exercises/theory/theory-practice-feedback";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import { revealTextForExercise } from "@/lib/theory-exercises/generate-ai";
import type { TheoryMultipleChoiceExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && selected === item.correctOption;
  const revealDisplay = revealTextForExercise(item);

  const pick = (option: string) => {
    if (checked) return;
    setSelected(option);
  };

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
    <motion.div
      key={item.id}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
      className="relative mx-auto w-full min-w-0 max-w-2xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
            {t("lesson.tryIt")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {item.instruction?.trim() || t("instructions.chooseForm")}
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" />
          {tAi("generated")}
        </p>
      </header>

      <div className="relative mt-8 sm:mt-10">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
        />
        <div className="min-w-0 pl-4 sm:pl-5">
          <p className="font-heading text-[1.5rem] leading-[1.45] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.85rem] md:text-[2.05rem]">
            {item.prompt}
          </p>

          <ExerciseHint
            resetKey={item.id}
            answered={checked}
            correctAnswer={revealDisplay}
            onRevealAnswer={revealAnswer}
          >
            <HintText text={item.hint} />
          </ExerciseHint>

          <div
            role="group"
            aria-label={item.instruction?.trim() || t("instructions.chooseForm")}
            className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
          >
            {item.options.map((option, optionIndex) => {
              const isSelected = selected === option;
              const isAnswer = option === item.correctOption;
              const showState = checked && (isSelected || isAnswer);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={checked}
                  onClick={() => pick(option)}
                  className={cn(
                    "min-h-14 rounded-xl border px-4 py-3.5 text-left text-[0.95rem] font-medium wrap-anywhere transition-[border-color,background-color,transform] duration-150",
                    "focus-visible:ring-2 focus-visible:ring-(--exercise-accent)/35 focus-visible:outline-none",
                    !checked &&
                      "border-hairline-cloud bg-background hover:border-(--exercise-accent)/40 hover:bg-(--exercise-accent-soft)/40",
                    !checked && isSelected && "border-(--exercise-accent) bg-(--exercise-accent-soft)",
                    showState && isAnswer && "border-success bg-success-muted text-success",
                    showState && isSelected && !isCorrect && "border-error bg-error-muted text-error",
                    checked && !isSelected && !isAnswer && "opacity-55",
                    !reduceMotion && !checked && "active:scale-[0.99]",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span className="font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {checked && isAnswer ? (
                      <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.6} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {!checked ? (
            <div className="mt-8">
              <Button
                type="button"
                onClick={check}
                disabled={!selected}
                className="h-11 w-full sm:h-9 sm:w-auto"
              >
                {t("check")}
              </Button>
            </div>
          ) : null}

          <TheoryPracticeFeedback
            checked={checked}
            correct={isCorrect}
            peeked={peeked}
            userValue={selected && selected !== item.correctOption ? selected : undefined}
            revealDisplay={revealDisplay}
            explanation={item.explanation}
            learningObjective={item.learningObjective}
            onNext={onNext}
          />
        </div>
      </div>
    </motion.div>
  );
}
