/**
 * Shared Exercise Studio AI / upload processing progress.
 * Progress is stage-based (real workflow milestones), not a fake timer.
 */

export type ProcessingStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "generating"
  | "saving"
  | "completed"
  | "error";

export type AIProcessingState = {
  stage: ProcessingStage;
  /** Overall workflow progress 0–100 (stage-weighted; upload uses real %). */
  progress: number;
  /** Optional override for the stage label (otherwise i18n by stage). */
  message?: string;
  /** Extra line (e.g. "4.2 MB / 10 MB"). */
  detail?: string;
  errorMessage?: string;
  /** Shown in the panel header (filename, theory title, etc.). */
  title?: string;
};

/** Progress when each stage becomes active (upload uses real % into 0–UPLOAD_CAP). */
export const STAGE_BASE_PROGRESS: Record<
  Exclude<ProcessingStage, "idle" | "error">,
  number
> = {
  uploading: 0,
  extracting: 40,
  analyzing: 55,
  generating: 75,
  saving: 92,
  completed: 100,
};

/** Upload maps 0–100% network progress into this overall range. */
export const UPLOAD_PROGRESS_CAP = 35;

export function isProcessingActive(stage: ProcessingStage): boolean {
  return (
    stage !== "idle" &&
    stage !== "completed" &&
    stage !== "error"
  );
}

export function progressForStage(
  stage: ProcessingStage,
  options?: {
    uploadPercent?: number;
    lastProgress?: number;
  },
): number {
  if (stage === "idle") return 0;
  if (stage === "completed") return 100;
  if (stage === "error") {
    return Math.min(99, Math.max(0, options?.lastProgress ?? 0));
  }
  if (stage === "uploading") {
    const uploadPercent = Math.min(100, Math.max(0, options?.uploadPercent ?? 0));
    return Math.round((uploadPercent / 100) * UPLOAD_PROGRESS_CAP);
  }
  return STAGE_BASE_PROGRESS[stage];
}

export type ProcessingPipelineId = "import" | "aiGenerate";

/** Stages shown in the pipeline UI (excludes idle / error / completed). */
export type PipelineStage = Exclude<
  ProcessingStage,
  "idle" | "error" | "completed"
>;

/** Ordered stages shown in the UI for each pipeline. */
export const PROCESSING_PIPELINES: Record<
  ProcessingPipelineId,
  readonly PipelineStage[]
> = {
  import: ["uploading", "extracting", "analyzing", "generating", "saving"],
  aiGenerate: ["generating", "saving"],
};

export function createIdleProcessingState(
  partial?: Partial<AIProcessingState>,
): AIProcessingState {
  return {
    stage: "idle",
    progress: 0,
    ...partial,
  };
}
