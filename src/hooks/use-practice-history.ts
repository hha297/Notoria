"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  commitPracticeSession,
  emptyPracticeHistory,
  loadPracticeHistory,
  recordPracticeAttempt,
  savePracticeHistory,
  type PracticeHistorySnapshot,
} from "@/lib/exercises/practice-history";

/**
 * Workspace-scoped practice history (localStorage). Survives Try Again and remount.
 */
export function usePracticeHistory(workspaceId: string) {
  const [history, setHistory] = useState<PracticeHistorySnapshot>(() =>
    emptyPracticeHistory(),
  );
  const historyRef = useRef(history);
  historyRef.current = history;
  const sessionWordIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!workspaceId) {
      setHistory(emptyPracticeHistory());
      return;
    }
    setHistory(loadPracticeHistory(workspaceId));
    sessionWordIdsRef.current = [];
  }, [workspaceId]);

  const persist = useCallback(
    (next: PracticeHistorySnapshot) => {
      historyRef.current = next;
      setHistory(next);
      savePracticeHistory(workspaceId, next);
    },
    [workspaceId],
  );

  const recordOutcome = useCallback(
    (wordId: string, correct: boolean) => {
      if (!wordId) return;
      sessionWordIdsRef.current.push(wordId);
      persist(recordPracticeAttempt(historyRef.current, wordId, correct));
    },
    [persist],
  );

  /** Call when starting a new set so prior session word ids get consecutive penalty. */
  const beginNextSession = useCallback(() => {
    const ids = sessionWordIdsRef.current;
    sessionWordIdsRef.current = [];
    if (ids.length === 0) return historyRef.current;
    const next = commitPracticeSession(historyRef.current, ids);
    persist(next);
    return next;
  }, [persist]);

  return {
    history,
    recordOutcome,
    beginNextSession,
  };
}
