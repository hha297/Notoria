"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import exerciseStyles from "@/components/style/listening/exercise.module.css";
import { mx } from "@/lib/css-module";

const EASE = [0.22, 1, 0.36, 1] as const;

type ListeningExerciseFeedbackProps = {
  correct: boolean;
  userAnswer?: string | null;
  expected?: string | null;
};

export function ListeningExerciseFeedback({
  correct,
  userAnswer,
  expected,
}: ListeningExerciseFeedbackProps) {
  const t = useTranslations("listening.practice");
  const reduceMotion = useReducedMotion();
  const showAttempt = !correct && Boolean(userAnswer?.trim());

  return (
    <AnimatePresence>
      <motion.div
        key={correct ? "ok" : "bad"}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE }}
        className={mx(exerciseStyles, "feedback")}
        data-state={correct ? "correct" : "incorrect"}
        aria-live="polite"
      >
        <p className={mx(exerciseStyles, "feedbackStatus")}>
          {correct ? (
            <CheckCircle2 className="size-4" aria-hidden />
          ) : (
            <XCircle className="size-4" aria-hidden />
          )}
          {correct ? t("correct") : t("incorrect")}
        </p>

        {!correct ? (
          <dl className={mx(exerciseStyles, "feedbackDl")}>
            {showAttempt ? (
              <div>
                <dt className={mx(exerciseStyles, "feedbackDt")}>
                  {t("yourAnswer")}
                </dt>
                <dd className={mx(exerciseStyles, "feedbackDd")}>
                  <span className={mx(exerciseStyles, "feedbackDdStrike")}>
                    {userAnswer}
                  </span>
                </dd>
              </div>
            ) : null}
            {expected ? (
              <div>
                <dt className={mx(exerciseStyles, "feedbackDt")}>
                  {t("expected")}
                </dt>
                <dd className={mx(exerciseStyles, "feedbackDd")}>{expected}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
