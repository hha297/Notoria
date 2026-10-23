"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Sparkles } from "lucide-react";
import { ProgressiveHintReveal } from "@/components/exercises/progressive-hint-reveal";
import { TheoryPracticeFeedback } from "@/components/exercises/theory/theory-practice-feedback";
import { EXERCISE_SET_QUESTION_CARD_CLASS } from "@/components/exercises/exercise-set-question-card";
import { revealTextForExercise } from "@/lib/theory-exercises/generate-ai";
import type { TheoryMultipleChoiceExercise } from "@/lib/theory-exercises/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function TheoryMultipleChoiceCard({
  item,
  number,
  value,
  onChange,
  submitted,
  correct,
  unanswered,
}: {
  item: TheoryMultipleChoiceExercise;
  number: number;
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  correct: boolean;
  unanswered: boolean;
}) {
  const t = useTranslations("exercises.theory");
  const tAi = useTranslations("exercises.ai");
  const reduceMotion = useReducedMotion();
  const selected = value || null;
  const isCorrect = submitted && correct && !unanswered;
  const revealDisplay = revealTextForExercise(item);

  return (
    <motion.article
      id={`theory-q-${item.id}`}
      data-question-id={item.id}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
      className={EXERCISE_SET_QUESTION_CARD_CLASS}
    >
      <header className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[0.68rem] font-semibold tracking-[0.2em] text-(--exercise-accent) uppercase">
              {number}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {item.instruction?.trim() || t("instructions.chooseForm")}
            </span>
          </p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3" />
          {tAi("generated")}
        </p>
      </header>

      <div className="relative mt-5 sm:mt-8">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-0 w-px bg-linear-to-b from-(--exercise-accent)/55 via-(--exercise-accent)/18 to-transparent"
        />
        <div className="min-w-0 pl-4 sm:pl-5">
          <p className="font-heading text-[1.35rem] leading-[1.45] font-semibold tracking-tight text-pretty wrap-anywhere text-ink sm:text-[1.65rem]">
            {item.prompt}
          </p>

          {!submitted ? (
            <ProgressiveHintReveal
              hints={item.hints}
              legacyHint={item.hint}
              grounding={item.learningObjective}
              answers={[item.correctOption, ...item.options]}
              resetKey={item.id}
              answered={submitted}
            />
          ) : null}

          <div
            role="group"
            aria-label={item.instruction?.trim() || t("instructions.chooseForm")}
            className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
          >
            {item.options.map((option, optionIndex) => {
              const isSelected = selected === option;
              const isAnswer = option === item.correctOption;
              const showState = submitted && (isSelected || isAnswer);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={submitted}
                  onClick={() => onChange(option)}
                  className={cn(
                    "min-h-14 rounded-xl border px-4 py-3.5 text-left text-[0.95rem] font-medium wrap-anywhere transition-[border-color,background-color,transform] duration-150",
                    "focus-visible:ring-2 focus-visible:ring-(--exercise-accent)/35 focus-visible:outline-none",
                    !submitted &&
                      "border-hairline-cloud control-surface hover:border-(--exercise-accent)/40 hover:bg-(--exercise-accent-soft)/40",
                    !submitted &&
                      isSelected &&
                      "border-(--exercise-accent) bg-(--exercise-accent-soft)",
                    showState &&
                      isAnswer &&
                      "border-success bg-success-muted text-success",
                    showState &&
                      isSelected &&
                      !isCorrect &&
                      "border-error bg-error-muted text-error",
                    submitted && !isSelected && !isAnswer && "opacity-55",
                    !reduceMotion && !submitted && "active:scale-[0.99]",
                  )}
                >
                  <span className="flex items-start gap-2">
                    <span className="font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="min-w-0 flex-1">{option}</span>
                    {submitted && isAnswer ? (
                      <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.6} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <TheoryPracticeFeedback
            checked={submitted}
            correct={isCorrect}
            unanswered={unanswered}
            userValue={
              selected && selected !== item.correctOption ? selected : undefined
            }
            revealDisplay={revealDisplay}
            explanation={item.explanation}
            learningObjective={item.learningObjective}
          />
        </div>
      </div>
    </motion.article>
  );
}
