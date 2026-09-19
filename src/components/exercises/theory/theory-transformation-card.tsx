"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { HintText } from "@/components/exercises/theory/theory-card-shared";
import { TheoryPracticeFeedback } from "@/components/exercises/theory/theory-practice-feedback";
import { ExerciseHint } from "@/components/exercises/exercise-hint";
import { Button } from "@/components/ui/button";
import { answersMatchAny, revealTextForExercise } from "@/lib/theory-exercises/generate-ai";
import type { TheoryTransformationExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const isCorrect = !peeked && answersMatchAny(value, item.acceptedAnswers);
  const revealDisplay = revealTextForExercise(item);
  const showArrow = item.showArrow !== false;
  const filledText = checked ? (isCorrect ? value.trim() : item.answer) : "";

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
            {item.instruction?.trim() ||
              (showArrow
                ? t("instructions.applyRule")
                : t("instructions.completeExercise"))}
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" />
          {tAi("generated")}
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (checked) onNext();
          else check();
        }}
        className="relative mt-8 sm:mt-10"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
        />
        <div className="min-w-0 pl-4 sm:pl-5">
          <p className="font-heading text-[1.5rem] leading-[1.55] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.85rem] md:text-[2.05rem]">
            <span>{item.promptWord}</span>
            <span className="mx-2 font-normal text-muted-foreground/70" aria-hidden>
              {showArrow ? "→" : ":"}
            </span>
            <span
              className={cn(
                "inline-flex max-w-full min-w-0 flex-col items-center align-baseline",
                checked && !isCorrect && !reduceMotion && "exercise-shake",
              )}
            >
              <span
                className={cn(
                  "relative inline-flex max-w-full min-w-26 items-end justify-center border-b-2 px-1.5 transition-colors duration-200",
                  !checked &&
                    "border-(--exercise-accent) has-focus-visible:border-b-[3px]",
                  checked && isCorrect && "border-success",
                  checked && !isCorrect && "border-error",
                )}
              >
                {checked ? (
                  <span
                    className={cn(
                      "px-0.5 text-center font-medium wrap-anywhere",
                      isCorrect ? "text-success" : "text-error",
                    )}
                  >
                    {filledText || "\u00a0"}
                  </span>
                ) : (
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="theory-exercise-form"
                    aria-label={t("fillPlaceholder")}
                    placeholder="?"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    className="h-[1.15em] w-[8ch] max-w-full bg-transparent p-0 text-center text-[1em] leading-none font-heading font-semibold tracking-tight text-(--exercise-accent) caret-(--exercise-accent) outline-none placeholder:text-(--exercise-accent)/30"
                  />
                )}
              </span>
            </span>
          </p>

          <ExerciseHint
            resetKey={item.id}
            answered={checked}
            correctAnswer={revealDisplay}
            onRevealAnswer={revealAnswer}
          >
            <HintText text={item.hint} />
          </ExerciseHint>

          {!checked ? (
            <div className="mt-8">
              <Button
                type="submit"
                disabled={!value.trim()}
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
            userValue={value}
            revealDisplay={revealDisplay}
            explanation={item.explanation}
            learningObjective={item.learningObjective}
            onNext={onNext}
          />
        </div>
      </form>
    </motion.div>
  );
}
