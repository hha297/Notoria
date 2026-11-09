"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export type ExerciseAnswerReviewProps = {
  revealed: boolean;
  isCorrect: boolean;
  peeked?: boolean;
  unanswered?: boolean;
  /** Learner’s submitted answer (shown on incorrect attempts). */
  userAnswer?: string | null;
  /** Canonical correct answer / surface form. */
  correctAnswer?: string | null;
  /**
   * Compact mode: hide the “Your answer / Correct answer” comparison when the
   * stage already highlights options (e.g. multiple choice). Still shows status.
   */
  compactComparison?: boolean;
  /** Optional grammatical / contextual explanation (never fabricated). */
  explanation?: string | null;
  /** Extra learning content (e.g. vocabulary usage example). */
  children?: ReactNode;
  className?: string;
  /** Override status labels (defaults to exercises.session). */
  correctLabel?: string;
  incorrectLabel?: string;
  unansweredLabel?: string;
};

/**
 * Shared post-answer review shell used by vocabulary exercise stages.
 * Preserves existing grading; only presents status, comparison, and extras.
 */
export function ExerciseAnswerReview({
  revealed,
  isCorrect,
  peeked = false,
  unanswered = false,
  userAnswer,
  correctAnswer,
  compactComparison = false,
  explanation,
  children,
  className,
  correctLabel,
  incorrectLabel,
  unansweredLabel,
}: ExerciseAnswerReviewProps) {
  const t = useTranslations("exercises.session");
  const reduceMotion = useReducedMotion();

  const statusCorrect = correctLabel ?? t("feedbackStatus.correct");
  const statusIncorrect = incorrectLabel ?? t("feedbackStatus.incorrect");
  const statusUnanswered = unansweredLabel ?? t("unanswered");

  const trimmedUser = userAnswer?.trim() ?? "";
  const trimmedCorrect = correctAnswer?.trim() ?? "";
  // Compact (e.g. multiple choice) skips the struck-through attempt — options
  // already show the selection — but still surfaces the correct answer.
  const showUserAttempt =
    !compactComparison &&
    !peeked &&
    !isCorrect &&
    !unanswered &&
    trimmedUser.length > 0;
  const showCorrectAnswer =
    trimmedCorrect.length > 0 && (unanswered || peeked || !isCorrect);
  const showExplanation = Boolean(explanation?.trim());

  return (
    <AnimatePresence>
      {revealed ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE }}
          className={cn("mt-5 space-y-4", className)}
          aria-live="polite"
        >
          <div
            className={cn(
              "flex min-h-12 items-center gap-2.5 rounded-xl border px-3.5 py-3 sm:px-4",
              unanswered
                ? "border-warning/35 bg-warning/10"
                : peeked
                  ? "border-hairline-cloud bg-muted/30"
                  : isCorrect
                    ? "border-success/35 bg-success/10"
                    : "border-error/35 bg-error/10",
            )}
          >
            <StatusIcon
              unanswered={unanswered}
              peeked={peeked}
              isCorrect={isCorrect}
            />
            <p
              className={cn(
                "min-w-0 text-sm leading-none font-semibold tracking-wide",
                unanswered
                  ? "text-warning"
                  : peeked
                    ? "text-muted-foreground"
                    : isCorrect
                      ? "text-success"
                      : "text-error",
              )}
            >
              {unanswered
                ? statusUnanswered
                : peeked || !isCorrect
                  ? statusIncorrect
                  : statusCorrect}
            </p>
          </div>

          {showUserAttempt || showCorrectAnswer || showExplanation ? (
            <dl className="space-y-3 rounded-xl border border-hairline-cloud/80 bg-background/35 px-3.5 py-3.5 sm:px-4 sm:py-4">
              {showUserAttempt ? (
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {t("yourAnswer")}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground wrap-anywhere sm:text-[0.9375rem]">
                    <span className="line-through decoration-error/70">
                      {trimmedUser}
                    </span>
                  </dd>
                </div>
              ) : null}

              {showCorrectAnswer ? (
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {t("correctAnswer")}
                  </dt>
                  <dd className="mt-1 font-heading text-base font-semibold leading-relaxed text-ink wrap-anywhere sm:text-[1.05rem]">
                    {trimmedCorrect}
                  </dd>
                </div>
              ) : null}

              {showExplanation ? (
                <div>
                  <dt className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {t("explanation")}
                  </dt>
                  <dd className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/80 wrap-anywhere sm:text-[0.9375rem]">
                    {explanation!.trim()}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function StatusIcon({
  unanswered,
  peeked,
  isCorrect,
}: {
  unanswered: boolean;
  peeked: boolean;
  isCorrect: boolean;
}) {
  if (unanswered) {
    return (
      <XCircle
        className="size-5 shrink-0 text-warning"
        strokeWidth={2.3}
        aria-hidden
      />
    );
  }
  if (peeked) {
    return (
      <CircleSlash
        className="size-5 shrink-0 text-muted-foreground"
        strokeWidth={2.3}
        aria-hidden
      />
    );
  }
  if (isCorrect) {
    return (
      <CheckCircle2
        className="size-5 shrink-0 text-success"
        strokeWidth={2.3}
        aria-hidden
      />
    );
  }
  return (
    <XCircle
      className="size-5 shrink-0 text-error"
      strokeWidth={2.3}
      aria-hidden
    />
  );
}
