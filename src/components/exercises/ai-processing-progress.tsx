"use client";

import { CheckCircle2, Loader2, RotateCcw, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PROCESSING_PIPELINES,
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
  generating: "stages.generating",
  saving: "stages.saving",
  completed: "stages.completed",
  error: "stages.error",
} as const satisfies Record<Exclude<ProcessingStage, "idle">, string>;

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
  const stageMessage =
    state.message ??
    (state.stage !== "idle"
      ? t(STAGE_MESSAGE_KEYS[state.stage])
      : "");

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
        "space-y-5 rounded-2xl border border-hairline-cloud bg-card px-5 py-6 sm:px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy={!isComplete && !isError}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          {isComplete ? (
            <CheckCircle2 className="size-5 text-accent-lime" />
          ) : isError ? (
            <XCircle className="size-5 text-destructive" />
          ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-heading text-lg font-medium text-ink">{title}</p>
          {state.detail ? (
            <p className="truncate text-sm text-muted-foreground">{state.detail}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={isError ? state.progress : state.progress} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium tabular-nums text-ink">
            {Math.round(state.progress)}%
          </span>
          <span
            className={cn(
              "text-right text-muted-foreground",
              isError && "text-destructive",
              isComplete && "text-ink",
            )}
          >
            {isError ? state.errorMessage || stageMessage : stageMessage}
          </span>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {stages.map((stage) => {
          const reached = stageRank(state.stage, pipeline) >= stageRank(stage, pipeline);
          const current = state.stage === stage;
          return (
            <li
              key={stage}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                current && !isError
                  ? "bg-accent-lime/25 text-ink"
                  : reached && !isError
                    ? "bg-muted text-ink"
                    : "bg-muted/40 text-muted-foreground",
                isError && current && "bg-destructive/10 text-destructive",
              )}
            >
              {t(STAGE_MESSAGE_KEYS[stage])}
            </li>
          );
        })}
      </ol>

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
            <Button type="button" variant="outline" size="sm" onClick={onDismissError}>
              {t("dismiss")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function stageRank(stage: ProcessingStage, pipeline: ProcessingPipelineId): number {
  if (stage === "completed") return 100;
  if (stage === "error" || stage === "idle") return -1;
  const list = PROCESSING_PIPELINES[pipeline];
  const index = list.indexOf(stage);
  return index >= 0 ? index : -1;
}
