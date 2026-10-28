"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import featureStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type TheoryPracticeFeedbackProps = {
  checked: boolean;
  correct: boolean;
  peeked?: boolean;
  unanswered?: boolean;
  userValue?: string;
  revealDisplay: string;
  explanation?: string;
  learningObjective?: string;
  sentenceMeaning?: string;
  /** Omit in set-review mode (no per-question Next). */
  onNext?: () => void;
};

export function TheoryPracticeFeedback({
  checked,
  correct,
  peeked = false,
  unanswered = false,
  userValue,
  revealDisplay,
  explanation,
  learningObjective,
  sentenceMeaning,
  onNext,
}: TheoryPracticeFeedbackProps) {
  const t = useTranslations("exercises.theory");
  const tSession = useTranslations("exercises.session");
  const reduceMotion = useReducedMotion();
  const showAttempt =
    checked &&
    !peeked &&
    !correct &&
    !unanswered &&
    Boolean(userValue?.trim());

  return (
    <AnimatePresence>
      {checked ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
          className="mt-5 space-y-4"
          aria-live="polite"
        >
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium tracking-wide",
              unanswered
                ? "font-semibold text-warning"
                : peeked
                  ? "text-muted-foreground"
                  : correct
                    ? "text-success"
                    : "text-error",
            )}
          >
            {unanswered ? (
              <>
                <XCircle className="size-4 shrink-0" strokeWidth={2.4} />
                {tSession("unanswered")}
              </>
            ) : peeked || !correct ? (
              t("feedback.incorrect")
            ) : (
              t("feedback.correct")
            )}
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
              <div className="pt-1">
                <dt className="sr-only">{t("lesson.example")}</dt>
                <dd className="flex max-w-2xl items-start gap-2 border-l-2 border-(--exercise-accent)/45 bg-(--exercise-accent-soft)/35 px-3 py-2.5 text-base leading-relaxed wrap-anywhere">
                  <ArrowRight
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-(--exercise-accent)"
                  />
                  <span className="font-semibold text-(--exercise-accent)">
                    {sentenceMeaning}
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>

          {onNext ? (
            <Button type="button" onClick={onNext} className="h-11 w-full sm:h-9 sm:w-auto">
              {t("next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
