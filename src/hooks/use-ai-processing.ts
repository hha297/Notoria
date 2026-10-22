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
        stageStartedAt:
          stage !== "idle" && stage !== "completed" && stage !== "error"
            ? Date.now()
            : undefined,
        errorMessage:
          stage === "error"
            ? (options?.errorMessage ?? prev.errorMessage)
            : undefined,
        failedAtStage: undefined,
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
        stageStartedAt: prev.stage === "uploading" ? prev.stageStartedAt : Date.now(),
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
      stageStartedAt: undefined,
      failedAtStage:
        prev.stage !== "idle" &&
        prev.stage !== "error" &&
        prev.stage !== "completed"
          ? prev.stage
          : prev.failedAtStage,
    }));
  }, []);

  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: "completed",
      progress: 100,
      errorMessage: undefined,
      stageStartedAt: undefined,
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
