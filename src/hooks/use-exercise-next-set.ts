"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAiPreferences } from "@/components/providers/ai-preferences-provider";
import {
  NEXT_SET_PREFETCH_DELAY_MS,
} from "@/lib/exercises/next-set-fingerprint";

export type NextSetStatus =
  | "idle"
  | "scheduled"
  | "preparing"
  | "ready"
  | "failed";

type UseExerciseNextSetOptions<TPayload, TResult> = {
  /** When false, never schedule background work. */
  enabled: boolean;
  /** Build the request payload for sequence N (words / theory config). */
  buildPayload: (sequence: number) => TPayload | null;
  /** Run generation; must attach to the durable job via nextSet meta. */
  generate: (
    payload: TPayload,
    meta: {
      sessionId: string;
      sequence: number;
      regenerate: boolean;
      signal: AbortSignal;
    },
  ) => Promise<{ ok: true; result: TResult } | { ok: false; retryable: boolean }>;
  /** Apply a ready result into the active session (New set). */
  applyResult: (result: TResult) => void;
};

/**
 * Interaction-delayed next-set prefetch with at most one pending/ready set.
 * Does not touch current answers — callers apply results only on New set.
 */
export function useExerciseNextSet<TPayload, TResult>(
  options: UseExerciseNextSetOptions<TPayload, TResult>,
) {
  const { preferences } = useAiPreferences();
  const prefetchEnabled =
    options.enabled && preferences.exerciseNextSetPrefetch !== false;

  const [status, setStatus] = useState<NextSetStatus>("idle");
  const [sequence, setSequence] = useState(0);

  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `ex-${Date.now()}`,
  );
  const interactedRef = useRef(false);
  const readyResultRef = useRef<TResult | null>(null);
  const readySequenceRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const failedOnceRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelBackground = useCallback(() => {
    clearTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
  }, [clearTimer]);

  const resetForNewActiveSet = useCallback(
    (nextSequence: number) => {
      cancelBackground();
      readyResultRef.current = null;
      readySequenceRef.current = null;
      interactedRef.current = false;
      failedOnceRef.current = false;
      setSequence(nextSequence);
      setStatus("idle");
    },
    [cancelBackground],
  );

  const runPrefetch = useCallback(
    async (targetSequence: number, regenerate: boolean) => {
      if (inFlightRef.current && !regenerate) return;
      const opts = optionsRef.current;
      if (!opts.enabled) return;

      const payload = opts.buildPayload(targetSequence);
      if (!payload) {
        setStatus("idle");
        return;
      }

      cancelBackground();
      inFlightRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("preparing");
      readyResultRef.current = null;
      readySequenceRef.current = null;

      try {
        const outcome = await opts.generate(payload, {
          sessionId: sessionIdRef.current,
          sequence: targetSequence,
          regenerate,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!outcome.ok) {
          failedOnceRef.current = true;
          setStatus("failed");
          return;
        }
        readyResultRef.current = outcome.result;
        readySequenceRef.current = targetSequence;
        setStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        failedOnceRef.current = true;
        setStatus("failed");
      } finally {
        inFlightRef.current = false;
      }
    },
    [cancelBackground],
  );

  const scheduleAfterInteraction = useCallback(() => {
    if (!prefetchEnabled) return;
    if (interactedRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    interactedRef.current = true;
    if (status === "ready" || status === "preparing" || status === "scheduled") {
      return;
    }
    clearTimer();
    setStatus("scheduled");
    const target = sequence + 1;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        setStatus("idle");
        interactedRef.current = false;
        return;
      }
      void runPrefetch(target, false);
    }, NEXT_SET_PREFETCH_DELAY_MS);
  }, [
    clearTimer,
    prefetchEnabled,
    runPrefetch,
    sequence,
    status,
  ]);

  const notifyAnswerInteraction = useCallback(() => {
    scheduleAfterInteraction();
  }, [scheduleAfterInteraction]);

  const retryPrefetch = useCallback(() => {
    if (failedOnceRef.current && status === "failed") {
      // One explicit retry only after a failure.
      void runPrefetch(sequence + 1, true);
    }
  }, [runPrefetch, sequence, status]);

  /**
   * New set: consume ready result, attach to in-flight job, or generate now.
   * Returns whether a foreground generate should run (with progress UI).
   */
  const openNextSet = useCallback(async (): Promise<
    | { mode: "applied" }
    | { mode: "attached"; promise: Promise<boolean> }
    | { mode: "generate"; sequence: number }
  > => {
    if (status === "ready" && readyResultRef.current != null) {
      const result = readyResultRef.current;
      const usedSequence = readySequenceRef.current ?? sequence + 1;
      optionsRef.current.applyResult(result);
      resetForNewActiveSet(usedSequence);
      return { mode: "applied" };
    }

    if (status === "preparing" || inFlightRef.current) {
      const target = sequence + 1;
      const promise = (async () => {
        // Wait until ready/failed/idle by polling local state via re-fetch attach.
        const payload = optionsRef.current.buildPayload(target);
        if (!payload) return false;
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const outcome = await optionsRef.current.generate(payload, {
            sessionId: sessionIdRef.current,
            sequence: target,
            regenerate: false,
            signal: controller.signal,
          });
          if (!outcome.ok) {
            setStatus("failed");
            failedOnceRef.current = true;
            return false;
          }
          optionsRef.current.applyResult(outcome.result);
          resetForNewActiveSet(target);
          return true;
        } catch {
          return false;
        }
      })();
      return { mode: "attached", promise };
    }

    return { mode: "generate", sequence: sequence + 1 };
  }, [resetForNewActiveSet, sequence, status]);

  const sessionId = sessionIdRef.current;

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTimer();
        if (status === "scheduled") {
          setStatus("idle");
          interactedRef.current = false;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearTimer, status]);

  useEffect(() => {
    return () => {
      cancelBackground();
    };
  }, [cancelBackground]);

  useEffect(() => {
    if (!prefetchEnabled) {
      cancelBackground();
      if (status === "scheduled" || status === "preparing") {
        setStatus("idle");
      }
    }
  }, [cancelBackground, prefetchEnabled, status]);

  return {
    sessionId,
    sequence,
    status,
    notifyAnswerInteraction,
    openNextSet,
    retryPrefetch,
    resetForNewActiveSet,
    markGeneratedSequence: (next: number) => {
      resetForNewActiveSet(next);
    },
  };
}
