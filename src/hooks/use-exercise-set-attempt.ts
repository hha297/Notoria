"use client";

import { useCallback, useMemo, useState } from "react";
import {
  answeredProgress,
  countAnsweredQuestions,
  retryQuestionIds,
  scoreSetResults,
  unansweredQuestionIds,
  type SetAttemptPhase,
  type SetQuestionResult,
} from "@/lib/exercises/set-attempt";

type UseExerciseSetAttemptOptions = {
  questionIds: readonly string[];
  isAnswered?: (questionId: string, value: unknown) => boolean;
};

/**
 * Set-level answering: store answers for every question, track answered
 * progress (not correctness), submit once, then expose per-question results.
 */
export function useExerciseSetAttempt({
  questionIds,
  isAnswered,
}: UseExerciseSetAttemptOptions) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [phase, setPhase] = useState<SetAttemptPhase>("answering");
  const [results, setResults] = useState<Record<string, SetQuestionResult>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  /** Bumps when a new attempt starts so list inputs remount cleanly. */
  const [attemptKey, setAttemptKey] = useState(0);

  const answeredCount = useMemo(
    () => countAnsweredQuestions(questionIds, answers, isAnswered),
    [answers, isAnswered, questionIds],
  );

  const progress = useMemo(
    () => answeredProgress(answeredCount, questionIds.length),
    [answeredCount, questionIds.length],
  );

  const unansweredIds = useMemo(
    () => unansweredQuestionIds(questionIds, answers, isAnswered),
    [answers, isAnswered, questionIds],
  );

  const score = useMemo(
    () => scoreSetResults(results, questionIds),
    [questionIds, results],
  );

  const setAnswer = useCallback(
    (questionId: string, value: unknown) => {
      if (phase !== "answering" || submitting) return;
      setAnswers((prev) => {
        const next = { ...prev };
        if (
          value == null ||
          (typeof value === "string" && value.length === 0)
        ) {
          delete next[questionId];
        } else {
          next[questionId] = value;
        }
        return next;
      });
    },
    [phase, submitting],
  );

  const clearAnswer = useCallback(
    (questionId: string) => {
      setAnswer(questionId, null);
    },
    [setAnswer],
  );

  const resetAttempt = useCallback(() => {
    setAnswers({});
    setResults({});
    setPhase("answering");
    setSubmitting(false);
    setAttemptKey((key) => key + 1);
  }, []);

  /**
   * Grade the current set. `grade` returns a result map keyed by question id.
   * Guards against duplicate submits while `submitting` or already submitted.
   */
  const submit = useCallback(
    async (
      grade: (
        answers: Readonly<Record<string, unknown>>,
        questionIds: readonly string[],
      ) =>
        | Record<string, SetQuestionResult>
        | Promise<Record<string, SetQuestionResult>>,
    ) => {
      if (phase !== "answering" || submitting) return null;
      setSubmitting(true);
      try {
        const graded = await grade(answers, questionIds);
        setResults(graded);
        setPhase("submitted");
        return graded;
      } finally {
        setSubmitting(false);
      }
    },
    [answers, phase, questionIds, submitting],
  );

  const beginRetry = useCallback(
    (mode: "incorrect" | "unanswered" | "incorrect_or_unanswered" | "all") => {
      const ids = retryQuestionIds(questionIds, results, mode);
      const nextAnswers: Record<string, unknown> = {};
      // Keep correct answers frozen out of the retry set; clear targets.
      for (const id of questionIds) {
        if (!ids.includes(id) && answers[id] != null) {
          nextAnswers[id] = answers[id];
        }
      }
      setAnswers(nextAnswers);
      setResults({});
      setPhase("answering");
      setSubmitting(false);
      setAttemptKey((key) => key + 1);
      return ids;
    },
    [answers, questionIds, results],
  );

  return {
    answers,
    phase,
    results,
    submitting,
    attemptKey,
    answeredCount: progress.answeredCount,
    totalQuestionCount: progress.totalQuestionCount,
    progressRatio: progress.ratio,
    unansweredIds,
    score,
    setAnswer,
    clearAnswer,
    resetAttempt,
    submit,
    beginRetry,
  };
}
