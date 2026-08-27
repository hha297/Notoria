"use client";

import { useCallback, useState } from "react";
import {
  createIdleProcessingState,
  isProcessingActive,
  progressForStage,
  type AIProcessingState,
  type ProcessingStage,
} from "@/lib/exercises/ai-processing";

export function useAiProcessing(initial?: Partial<AIProcessingState>) {
  const [state, setState] = useState<AIProcessingState>(() =>
    createIdleProcessingState(initial),
  );

  const reset = useCallback((partial?: Partial<AIProcessingState>) => {
    setState(createIdleProcessingState(partial));
  }, []);

  const setStage = useCallback(
    (
      stage: ProcessingStage,
      options?: {
        message?: string;
        detail?: string;
        title?: string;
        uploadPercent?: number;
        errorMessage?: string;
      },
    ) => {
      setState((prev) => ({
        stage,
        progress: progressForStage(stage, {
          uploadPercent: options?.uploadPercent,
          lastProgress: prev.progress,
        }),
        message: options?.message,
        detail: options?.detail,
        title: options?.title ?? prev.title,
        errorMessage:
          stage === "error"
            ? (options?.errorMessage ?? prev.errorMessage)
            : undefined,
      }));
    },
    [],
  );

  const setUploadProgress = useCallback(
    (input: {
      percent: number;
      loaded?: number;
      total?: number;
      detail?: string;
      title?: string;
    }) => {
      setState((prev) => ({
        ...prev,
        stage: "uploading",
        progress: progressForStage("uploading", {
          uploadPercent: input.percent,
        }),
        title: input.title ?? prev.title,
        detail: input.detail ?? prev.detail,
        errorMessage: undefined,
      }));
    },
    [],
  );

  const fail = useCallback((errorMessage: string) => {
    setState((prev) => ({
      ...prev,
      stage: "error",
      progress: progressForStage("error", { lastProgress: prev.progress }),
      errorMessage,
    }));
  }, []);

  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: "completed",
      progress: 100,
      errorMessage: undefined,
    }));
  }, []);

  return {
    state,
    setStage,
    setUploadProgress,
    reset,
    fail,
    complete,
    isActive: isProcessingActive(state.stage),
    isBusy:
      isProcessingActive(state.stage) || state.stage === "completed",
  };
}
