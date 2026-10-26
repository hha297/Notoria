"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useExerciseDisplayMode } from "@/hooks/use-exercise-display-mode";
import { useExerciseReviewState } from "@/components/exercises/exercise-set-review-nav";
import {
  filterQuestionIdsForReview,
  originalQuestionNumbers,
} from "@/lib/exercises/set-review";
import type { SetQuestionResult } from "@/lib/exercises/set-attempt";
import {
  scrollToExerciseQuestion,
  scrollToNewExerciseSet,
} from "@/lib/exercises/scroll-set";
import { isNonEmptyAnswer } from "@/lib/exercises/set-attempt";

type UseExerciseSetUiOptions = {
  questionIds: readonly string[];
  results: Readonly<Record<string, SetQuestionResult>>;
  answers: Readonly<Record<string, unknown>>;
  attemptPhase: "answering" | "submitted";
  answeredCount: number;
  checkedCount: number;
  /** Prefix for question DOM ids, e.g. "mc-q" → mc-q-${id}. */
  questionIdPrefix: string;
  /** Stable top-of-set anchor id. */
  setAnchorId: string;
};

/**
 * Shared display-mode cursor, review filters, and scroll helpers for set sessions.
 */
export function useExerciseSetUi({
  questionIds,
  results,
  answers,
  attemptPhase,
  answeredCount,
  checkedCount,
  questionIdPrefix,
  setAnchorId,
}: UseExerciseSetUiOptions) {
  const { displayMode, setDisplayMode } = useExerciseDisplayMode();
  const [cursor, setCursor] = useState(0);
  const review = useExerciseReviewState();
  const submitted = attemptPhase === "submitted";

  const displayModeLocked =
    answeredCount > 0 || checkedCount > 0 || submitted;

  const questionDomId = useCallback(
    (id: string) => `${questionIdPrefix}-${id}`,
    [questionIdPrefix],
  );

  const numbers = useMemo(
    () => originalQuestionNumbers(questionIds),
    [questionIds],
  );

  // Keep cursor in range when the active question list changes.
  useEffect(() => {
    if (questionIds.length === 0) {
      setCursor(0);
      return;
    }
    setCursor((current) => Math.min(current, questionIds.length - 1));
  }, [questionIds]);

  const { resetReview, filter, setFilter, focusedId, setFocusedId } = review;

  const resetPresentation = useCallback(() => {
    setCursor(0);
    resetReview();
  }, [resetReview]);

  const scrollToSetStart = useCallback(() => {
    scrollToNewExerciseSet(setAnchorId);
  }, [setAnchorId]);

  const afterNewSet = useCallback(() => {
    resetPresentation();
    scrollToSetStart();
  }, [resetPresentation, scrollToSetStart]);

  const currentQuestionId = questionIds[cursor] ?? null;
  const isLastQuestion =
    questionIds.length > 0 && cursor >= questionIds.length - 1;

  const currentChecked = Boolean(
    currentQuestionId && results[currentQuestionId],
  );

  const currentCanCheck = Boolean(
    currentQuestionId && isNonEmptyAnswer(answers[currentQuestionId]),
  );

  const goNextQuestion = useCallback(() => {
    if (isLastQuestion) return;
    const nextIndex = cursor + 1;
    setCursor(nextIndex);
    const nextId = questionIds[nextIndex];
    if (nextId) {
      // Scroll the upcoming question into view (not leftover feedback).
      requestAnimationFrame(() => {
        scrollToExerciseQuestion(questionDomId(nextId));
      });
    }
  }, [cursor, isLastQuestion, questionDomId, questionIds]);

  const visibleQuestionIds = useMemo(() => {
    if (!submitted) {
      if (displayMode === "one_by_one") {
        return currentQuestionId ? [currentQuestionId] : [];
      }
      return [...questionIds];
    }
    return filterQuestionIdsForReview(questionIds, results, filter);
  }, [
    currentQuestionId,
    displayMode,
    filter,
    questionIds,
    results,
    submitted,
  ]);

  const jumpToUnanswered = useCallback(
    (unansweredIds: readonly string[]) => {
      const first = unansweredIds[0];
      if (!first) return;
      if (displayMode === "one_by_one") {
        const index = questionIds.indexOf(first);
        if (index >= 0) setCursor(index);
      }
      scrollToExerciseQuestion(questionDomId(first));
    },
    [displayMode, questionDomId, questionIds],
  );

  const openWrongReview = useCallback(() => {
    const needs = filterQuestionIdsForReview(
      questionIds,
      results,
      "needs_review",
    );
    const first = needs[0];
    if (!first) return;
    setFilter("needs_review");
    setFocusedId(first);
    scrollToExerciseQuestion(questionDomId(first));
  }, [questionDomId, questionIds, results, setFilter, setFocusedId]);

  return {
    displayMode,
    setDisplayMode,
    displayModeLocked,
    cursor,
    setCursor,
    currentQuestionId,
    currentChecked,
    currentCanCheck,
    isLastQuestion,
    goNextQuestion,
    visibleQuestionIds,
    numbers,
    questionDomId,
    setAnchorId,
    reviewFilter: filter,
    setReviewFilter: setFilter,
    focusedReviewId: focusedId,
    setFocusedReviewId: setFocusedId,
    resetPresentation,
    afterNewSet,
    scrollToSetStart,
    jumpToUnanswered,
    openWrongReview,
    submitted,
  };
}
