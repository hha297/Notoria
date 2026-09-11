"use client";

import { useCallback, useState } from "react";

export type ExerciseSessionScore = {
  correct: number;
  answered: number;
};

/**
 * Shared index / score / answered / peek / next / restart loop for
 * vocabulary exercise sessions (type-answer, multiple-choice, etc.).
 * Item pools, filters, and per-item UI state stay in the session.
 */
export function useExerciseSessionController() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<ExerciseSessionScore>({
    correct: 0,
    answered: 0,
  });
  const [answered, setAnswered] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [complete, setComplete] = useState(false);

  const clearItemFlags = useCallback(() => {
    setAnswered(false);
    setPeeked(false);
  }, []);

  const restart = useCallback(() => {
    setCurrentIndex(0);
    setScore({ correct: 0, answered: 0 });
    setAnswered(false);
    setPeeked(false);
    setComplete(false);
  }, []);

  const next = useCallback(
    (total: number) => {
      if (currentIndex < total - 1) {
        setCurrentIndex((i) => i + 1);
        clearItemFlags();
        return;
      }
      setComplete(true);
    },
    [clearItemFlags, currentIndex],
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    clearItemFlags();
  }, [clearItemFlags]);

  const recordAnswer = useCallback(
    (correct: boolean) => {
      if (answered) return;
      setAnswered(true);
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        answered: s.answered + 1,
      }));
    },
    [answered],
  );

  const peek = useCallback(() => {
    if (answered) return;
    setPeeked(true);
    setAnswered(true);
    setScore((s) => ({
      correct: s.correct,
      answered: s.answered + 1,
    }));
  }, [answered]);

  return {
    currentIndex,
    setCurrentIndex,
    score,
    answered,
    peeked,
    complete,
    restart,
    next,
    goPrev,
    recordAnswer,
    peek,
    clearItemFlags,
  };
}
