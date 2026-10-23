import { NextResponse } from "next/server";
import { AI_JOBS, runExclusiveJob, type JobLockStore } from "@/lib/ai/job-lock";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import {
  NEXT_SET_RESULT_TTL_MS,
  buildExerciseNextSetSubject,
  fingerprintExerciseNextSet,
  type ExerciseNextSetFingerprintInput,
} from "@/lib/exercises/next-set-fingerprint";

export type ExclusiveExerciseJobResult<T> =
  | { status: "completed"; duplicate: boolean; result: T }
  | { status: "in_progress" }
  | { status: "blocked"; response: NextResponse };

class MeteredGateError extends Error {
  readonly response: NextResponse;

  constructor(response: NextResponse) {
    super("METERED_GATE");
    this.name = "MeteredGateError";
    this.response = response;
  }
}

/**
 * Atomically claim an exercise-generation job, reserve quota once per subject,
 * and cache the result for refresh / New set attach within TTL.
 */
export async function runExclusiveExerciseGeneration<T>(input: {
  userId: string;
  fingerprint: ExerciseNextSetFingerprintInput;
  regenerate?: boolean;
  store?: JobLockStore;
  generate: () => Promise<T>;
}): Promise<ExclusiveExerciseJobResult<T>> {
  const fingerprint = fingerprintExerciseNextSet(input.fingerprint);
  const subjectId = buildExerciseNextSetSubject(input.userId, fingerprint);

  try {
    const outcome = await runExclusiveJob({
      operation: AI_JOBS.exerciseNextSet,
      subjectId,
      ttlMs: NEXT_SET_RESULT_TTL_MS,
      regenerate: input.regenerate === true,
      store: input.store,
      heartbeat: input.store ? false : undefined,
      run: async () => {
        const access = await guardMeteredAi("ai_exercise", { subjectId });
        if (!access.ok) {
          throw new MeteredGateError(access.response);
        }
        try {
          const result = await input.generate();
          await settleMeteredAi(access, true);
          return result;
        } catch (error) {
          await settleMeteredAi(access, false, error);
          throw error;
        }
      },
    });

    if (outcome.status === "in_progress") {
      return { status: "in_progress" };
    }
    return {
      status: "completed",
      duplicate: outcome.duplicate,
      result: outcome.result,
    };
  } catch (error) {
    if (error instanceof MeteredGateError) {
      return { status: "blocked", response: error.response };
    }
    throw error;
  }
}

export function exerciseJobInProgressResponse() {
  return NextResponse.json(
    { ok: false, code: "AI_JOB_IN_PROGRESS" as const },
    { status: 202 },
  );
}
