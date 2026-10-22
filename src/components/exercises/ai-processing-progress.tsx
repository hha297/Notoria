"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PROCESSING_PIPELINES,
  isIndeterminateStage,
  type AIProcessingState,
  type ProcessingPipelineId,
  type ProcessingStage,
} from "@/lib/exercises/ai-processing";
import { cn } from "@/lib/utils";

type AiProcessingProgressProps = {
  state: AIProcessingState;
  pipeline: ProcessingPipelineId;
  className?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismissError?: () => void;
};

const STAGE_MESSAGE_KEYS = {
  uploading: "stages.uploading",
  extracting: "stages.extracting",
  analyzing: "stages.analyzing",
  preparing: "stages.preparing",
  generating: "stages.generating",
  validating: "stages.validating",
  saving: "stages.saving",
  completed: "stages.completed",
  error: "stages.error",
} as const satisfies Record<Exclude<ProcessingStage, "idle">, string>;

const STAGE_HINT_KEYS = {
  uploading: "hints.uploading",
  extracting: "hints.extracting",
  analyzing: "hints.analyzing",
  preparing: "hints.preparing",
  generating: "hints.generating",
  validating: "hints.validating",
  saving: "hints.saving",
} as const;

export function AiProcessingProgress({
  state,
  pipeline,
  className,
  onCancel,
  onRetry,
  onDismissError,
}: AiProcessingProgressProps) {
  const t = useTranslations("exercises.processing");
  const stages = PROCESSING_PIPELINES[pipeline];
  const isError = state.stage === "error";
  const isComplete = state.stage === "completed";
  const indeterminate =
    !isError && !isComplete && isIndeterminateStage(state.stage);
  const elapsedSeconds = useElapsedSeconds(
    indeterminate ? state.stageStartedAt : undefined,
  );

  const stageMessage =
    state.message ??
    (state.stage !== "idle" ? t(STAGE_MESSAGE_KEYS[state.stage]) : "");

  const stageHint =
    state.detail ??
    (state.stage !== "idle" &&
    state.stage !== "completed" &&
    state.stage !== "error" &&
    state.stage in STAGE_HINT_KEYS
      ? t(STAGE_HINT_KEYS[state.stage as keyof typeof STAGE_HINT_KEYS])
      : null);

  const title =
    state.title ??
    (isComplete
      ? t("readyTitle")
      : isError
        ? t("errorTitle")
        : t("workingTitle"));

  return (
    <div
      className={cn(
        "exercise-panel space-y-5 rounded-2xl border border-page-accent-border/70 px-5 py-6 sm:px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-(--page-accent-selected)/60 text-ink">
          {isComplete ? (
            <CheckCircle2 className="size-5 text-page-accent" aria-hidden />
          ) : isError ? (
            <XCircle className="size-5 text-destructive" aria-hidden />
          ) : (
            <Loader2
              className="size-5 animate-spin text-page-accent motion-reduce:animate-none"
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-heading text-lg font-semibold tracking-tight text-ink">
            {title}
          </p>
          <p className="text-sm font-medium text-ink">{stageMessage}</p>
          {stageHint ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {stageHint}
            </p>
          ) : null}
          {indeterminate && elapsedSeconds >= 8 ? (
            <p className="text-sm text-muted-foreground">
              {t("stillWorking", { seconds: elapsedSeconds })}
            </p>
          ) : null}
        </div>
      </div>

      {indeterminate ? (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-page-accent/70 motion-reduce:animate-none" />
        </div>
      ) : state.progress != null ? (
        <div className="space-y-2">
          <Progress value={state.progress} />
          <p className="text-sm tabular-nums text-muted-foreground">
            {Math.round(state.progress)}%
          </p>
        </div>
      ) : null}

      <ol className="space-y-2">
        {stages.map((stage) => {
          const activeStage = isError
            ? (state.failedAtStage ?? "generating")
            : state.stage;
          const rank = stageRank(activeStage, pipeline);
          const thisRank = stageRank(stage, pipeline);
          const done = rank > thisRank;
          const current = activeStage === stage;
          return (
            <li
              key={stage}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm",
                current && !isError && "bg-(--page-accent-selected)/50",
                done && "opacity-80",
              )}
            >
              <span className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2
                    className="size-4 text-page-accent"
                    aria-hidden
                  />
                ) : current && !isError ? (
                  <Loader2
                    className="size-4 animate-spin text-page-accent motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : isError && current ? (
                  <XCircle className="size-4 text-destructive" aria-hidden />
                ) : (
                  <Circle
                    className="size-4 text-muted-foreground/50"
                    aria-hidden
                  />
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 leading-snug",
                  current && !isError && "font-medium text-ink",
                  done && "text-ink",
                  !current && !done && "text-muted-foreground",
                  isError && current && "font-medium text-destructive",
                )}
              >
                {t(STAGE_MESSAGE_KEYS[stage])}
              </span>
            </li>
          );
        })}
      </ol>

      {isError && state.errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {state.errorMessage}
        </p>
      ) : null}

      {state.stage === "uploading" && onCancel ? (
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="size-3.5" />
          {t("cancel")}
        </Button>
      ) : null}

      {isError ? (
        <div className="flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" size="sm" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              {t("retry")}
            </Button>
          ) : null}
          {onDismissError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDismissError}
            >
              {t("dismiss")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useElapsedSeconds(startedAt?: number) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) {
      setSeconds(0);
      return;
    }
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return seconds;
}

function stageRank(stage: ProcessingStage, pipeline: ProcessingPipelineId): number {
  if (stage === "completed") return 100;
  if (stage === "error" || stage === "idle") return -1;
  const list = PROCESSING_PIPELINES[pipeline];
  const index = list.indexOf(stage as (typeof list)[number]);
  return index >= 0 ? index : -1;
}
