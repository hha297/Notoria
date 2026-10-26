"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_EXERCISE_DISPLAY_MODE,
  EXERCISE_DISPLAY_MODE_STORAGE_KEY,
  parseExerciseDisplayMode,
  type ExerciseDisplayMode,
} from "@/lib/exercises/display-mode";

function readStoredDisplayMode(): ExerciseDisplayMode {
  if (typeof window === "undefined") return DEFAULT_EXERCISE_DISPLAY_MODE;
  try {
    return parseExerciseDisplayMode(
      localStorage.getItem(EXERCISE_DISPLAY_MODE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_EXERCISE_DISPLAY_MODE;
  }
}

/**
 * Global display preference across exercise modes (one-by-one vs all questions).
 * Persists in localStorage so the last choice carries to the next session.
 */
export function useExerciseDisplayMode() {
  const [displayMode, setDisplayModeState] = useState<ExerciseDisplayMode>(
    () => readStoredDisplayMode(),
  );

  const setDisplayMode = useCallback((next: ExerciseDisplayMode) => {
    setDisplayModeState(next);
    try {
      localStorage.setItem(EXERCISE_DISPLAY_MODE_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return { displayMode, setDisplayMode };
}
