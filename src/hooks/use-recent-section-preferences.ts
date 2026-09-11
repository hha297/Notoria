"use client";

import { useCallback, useRef } from "react";
import {
  EMPTY_RECENT_PREFERENCES,
  preferencesFromOutcomes,
  upsertSectionOutcome,
  type RecentSectionPreferences,
  type SectionWordOutcome,
} from "@/lib/exercises/recent-outcomes";

/**
 * In-memory recent-section preferences for consecutive exercise rounds.
 * Resets naturally on remount / navigation; not persisted.
 */
export function useRecentSectionPreferences() {
  const prefsRef = useRef<RecentSectionPreferences>(EMPTY_RECENT_PREFERENCES);
  const outcomesRef = useRef<SectionWordOutcome[]>([]);

  const recordOutcome = useCallback((outcome: SectionWordOutcome) => {
    outcomesRef.current = upsertSectionOutcome(outcomesRef.current, outcome);
  }, []);

  const commitAndBeginNext = useCallback((): RecentSectionPreferences => {
    if (outcomesRef.current.length > 0) {
      prefsRef.current = preferencesFromOutcomes(outcomesRef.current);
    }
    outcomesRef.current = [];
    return prefsRef.current;
  }, []);

  const clearPreferences = useCallback(() => {
    prefsRef.current = EMPTY_RECENT_PREFERENCES;
    outcomesRef.current = [];
  }, []);

  return {
    recordOutcome,
    commitAndBeginNext,
    clearPreferences,
  };
}
