"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import featureStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type TheoryPracticeFeedbackProps = {
  checked: boolean;
  correct: boolean;
  peeked?: boolean;
  userValue?: string;
  revealDisplay: string;
  explanation?: string;
  learningObjective?: string;
  sentenceMeaning?: string;
  onNext: () => void;
};

export function TheoryPracticeFeedback({
  checked,
  correct,
  peeked = false,
  userValue,
  revealDisplay,
  explanation,
  learningObjective,
  sentenceMeaning,
  onNext,
}: TheoryPracticeFeedbackProps) {
  const t = useTranslations("exercises.theory");
  const reduceMotion = useReducedMotion();
  const showAttempt =
    checked && !peeked && !correct && Boolean(userValue?.trim());

  return (
    <AnimatePresence>
      {checked ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
          className="mt-8 space-y-5"
          aria-live="polite"
        >
          <p
            className={cn(
              "text-sm font-medium tracking-wide",
              peeked
                ? "text-muted-foreground"
                : correct
                  ? "text-success"
                  : "text-error",
            )}
          >
            {peeked || !correct
              ? t("feedback.incorrect")
              : t("feedback.correct")}
          </p>

          <dl className="space-y-3 text-sm leading-relaxed sm:text-[0.9375rem]">
            {showAttempt ? (
              <div>
                <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {t("lesson.yourAnswer")}
                </dt>
                <dd className="mt-1 text-muted-foreground wrap-anywhere">
                  <span className="line-through decoration-error/70">
                    {userValue}
                  </span>
                </dd>
              </div>
            ) : null}

            <div>
              <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {t("lesson.correctForm")}
              </dt>
              <dd className="mt-1">
                <span className={mx(featureStyles, "theory-lesson-term wrap-anywhere")}>
                  {revealDisplay}
                </span>
              </dd>
            </div>

            {learningObjective?.trim() ? (
              <div>
                <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {t("lesson.theRule")}
                </dt>
                <dd className="mt-1 max-w-xl text-ink/80 wrap-anywhere">
                  {learningObjective}
                </dd>
              </div>
            ) : null}

            {explanation?.trim() ? (
              <div>
                <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {t("lesson.why")}
                </dt>
                <dd className="mt-1 max-w-xl text-ink/80 wrap-anywhere">
                  {explanation}
                </dd>
              </div>
            ) : null}

            {sentenceMeaning?.trim() ? (
              <div>
                <dt className="sr-only">{t("lesson.example")}</dt>
                <dd className="mt-1 max-w-xl text-muted-foreground wrap-anywhere">
                  {sentenceMeaning}
                </dd>
              </div>
            ) : null}
          </dl>

          <Button type="button" onClick={onNext} className="h-11 w-full sm:h-9 sm:w-auto">
            {t("next")}
            <ChevronRight className="size-4" />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
