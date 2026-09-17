"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_EXERCISE_DIFFICULTY,
  parseExerciseDifficulty,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";

function storageKey(scope: string) {
  return `notoria-exercise-difficulty:${scope}`;
}

function readStoredDifficulty(scope: string): ExerciseDifficulty {
  if (typeof window === "undefined") return DEFAULT_EXERCISE_DIFFICULTY;
  try {
    return parseExerciseDifficulty(sessionStorage.getItem(storageKey(scope)));
  } catch {
    return DEFAULT_EXERCISE_DIFFICULTY;
  }
}

/**
 * Persist difficulty for a session scope (e.g. "fill_blank", "flashcards").
 * Survives question changes; scoped per exercise mode, not global forever.
 */
export function useExerciseDifficulty(scope: string) {
  const [difficulty, setDifficultyState] = useState<ExerciseDifficulty>(() =>
    readStoredDifficulty(scope),
  );
  const [activeScope, setActiveScope] = useState(scope);

  if (scope !== activeScope) {
    setActiveScope(scope);
    setDifficultyState(readStoredDifficulty(scope));
  }

  const setDifficulty = useCallback(
    (next: ExerciseDifficulty) => {
      setDifficultyState(next);
      try {
        sessionStorage.setItem(storageKey(scope), next);
      } catch {
        // sessionStorage may be unavailable
      }
    },
    [scope],
  );

  return { difficulty, setDifficulty, ready: true as const };
}
