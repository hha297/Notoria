import { createHash } from "node:crypto";

export const DEFAULT_NEXT_SET_COUNT = 10;
export const NEXT_SET_PREFETCH_DELAY_MS = 18_000;
export const NEXT_SET_RESULT_TTL_MS = 30 * 60 * 1000;
export const NEXT_SET_POLL_INTERVAL_MS = 2_000;
export const NEXT_SET_POLL_MAX_MS = 180_000;

export type ExerciseNextSetKind =
  | "fill_blank"
  | "contextual_multiple_choice"
  | "contextual_type_answer"
  | "theory";

export type ExerciseNextSetFingerprintInput = {
  kind: ExerciseNextSetKind;
  /** Client exercise-session id (stable for the page visit). */
  sessionId: string;
  workspaceId?: string | null;
  /** Stable source ids (word ids or theory ids), sorted by caller. */
  sourceIds: string[];
  /** Optional revision tokens (e.g. updatedAt ISO) aligned with sources. */
  sourceRevisions?: string[];
  mode?: string | null;
  difficulty?: string | null;
  language?: string | null;
  uiLocale?: string | null;
  count: number;
  additionalInstructions?: string | null;
  sequence: number;
};

export function buildExerciseNextSetSubject(
  userId: string,
  fingerprint: string,
) {
  return `exercise-next:${userId}:${fingerprint}`;
}

export function fingerprintExerciseNextSet(
  input: ExerciseNextSetFingerprintInput,
) {
  const payload = {
    kind: input.kind,
    sessionId: input.sessionId,
    workspaceId: input.workspaceId?.trim() || null,
    sourceIds: [...input.sourceIds].sort(),
    sourceRevisions: [...(input.sourceRevisions ?? [])].sort(),
    mode: input.mode?.trim() || null,
    difficulty: input.difficulty?.trim() || null,
    language: input.language?.trim() || null,
    uiLocale: input.uiLocale?.trim() || null,
    count: input.count,
    additionalInstructions:
      input.additionalInstructions?.trim().slice(0, 2_000) || null,
    sequence: input.sequence,
  };
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 40);
}
