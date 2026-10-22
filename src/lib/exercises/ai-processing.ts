/**
 * Shared Exercise Studio AI / upload processing progress.
 * Stages map to real workflow milestones — not a fake timer.
 */

export type ProcessingStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "preparing"
  | "generating"
  | "validating"
  | "saving"
  | "completed"
  | "error";

export type AIProcessingState = {
  stage: ProcessingStage;
  /**
   * Overall workflow progress 0–100 when known.
   * Null means indeterminate (long provider wait) — UI must not invent %.
   */
  progress: number | null;
  /** Optional override for the stage label (otherwise i18n by stage). */
  message?: string;
  /** Extra line (e.g. "4.2 MB / 10 MB", "Still generating…"). */
  detail?: string;
  errorMessage?: string;
  /** Shown in the panel header (filename, theory title, etc.). */
  title?: string;
  /** Epoch ms when the current active stage began (for elapsed time). */
  stageStartedAt?: number;
  /** Stage that was active when generation failed (keeps checklist honest). */
  failedAtStage?: Exclude<ProcessingStage, "idle" | "error" | "completed">;
};

/** Progress when each discrete stage becomes active (upload uses real %). */
export const STAGE_BASE_PROGRESS: Record<
  Exclude<ProcessingStage, "idle" | "error" | "generating" | "validating">,
  number
> = {
  uploading: 0,
  extracting: 40,
  analyzing: 55,
  preparing: 10,
  saving: 90,
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

/** Long provider waits — show indeterminate UI, not a stuck percentage. */
export function isIndeterminateStage(stage: ProcessingStage): boolean {
  return stage === "generating" || stage === "validating";
}

export function progressForStage(
  stage: ProcessingStage,
  options?: {
    uploadPercent?: number;
    lastProgress?: number | null;
  },
): number | null {
  if (stage === "idle") return 0;
  if (stage === "completed") return 100;
  if (stage === "error") {
    const last = options?.lastProgress;
    if (last == null) return null;
    return Math.min(99, Math.max(0, last));
  }
  if (isIndeterminateStage(stage)) return null;
  if (stage === "uploading") {
    const uploadPercent = Math.min(100, Math.max(0, options?.uploadPercent ?? 0));
    return Math.round((uploadPercent / 100) * UPLOAD_PROGRESS_CAP);
  }
  if (stage in STAGE_BASE_PROGRESS) {
    return STAGE_BASE_PROGRESS[stage as keyof typeof STAGE_BASE_PROGRESS];
  }
  return null;
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
  aiGenerate: ["preparing", "generating", "validating", "saving"],
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
