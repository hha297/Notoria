import { mapAiClientCode } from "@/lib/ai/client-status";
import type { ExerciseNextSetMeta } from "@/lib/exercises/ai-types";
import {
  NEXT_SET_POLL_INTERVAL_MS,
  NEXT_SET_POLL_MAX_MS,
} from "@/lib/exercises/next-set-fingerprint";
import type { TheoryExercise } from "@/lib/theory-exercises/types";
import type { TheoryQuestionType } from "@/lib/theory-exercises/question-type";

export type TheoryExerciseAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_DISABLED"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY"
    | "AI_QUOTA_EXCEEDED"
    | "PREMIUM_REQUIRED"
    | "AI_JOB_IN_PROGRESS"
    | "NOT_FOUND";
};

export type TheoryExerciseAiClientResult =
  | { ok: true; exercises: TheoryExercise[]; reused?: boolean }
  | TheoryExerciseAiClientFailure;

async function sleep(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function requestTheoryExerciseAi(
  input: {
    theoryId: string;
    count?: number;
    uiLocale?: string;
    additionalInstructions?: string | null;
    questionType?: TheoryQuestionType;
    nextSet?: ExerciseNextSetMeta;
  },
  options?: { signal?: AbortSignal; poll?: boolean },
): Promise<TheoryExerciseAiClientResult> {
  const poll = options?.poll !== false;
  const started = Date.now();

  try {
    for (;;) {
      if (options?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const response = await fetch("/api/ai/theory-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: options?.signal,
      });

      const payload = (await response.json()) as
        | { ok: true; exercises: TheoryExercise[]; reused?: boolean }
        | { ok?: false; code?: TheoryExerciseAiClientFailure["code"] };

      const failureCode =
        payload && "code" in payload ? payload.code : undefined;
      if (response.status === 202 || failureCode === "AI_JOB_IN_PROGRESS") {
        if (!poll) return { ok: false, code: "AI_JOB_IN_PROGRESS" };
        if (Date.now() - started > NEXT_SET_POLL_MAX_MS) {
          return { ok: false, code: "AI_UNAVAILABLE" };
        }
        await sleep(NEXT_SET_POLL_INTERVAL_MS, options?.signal);
        continue;
      }

      if (!response.ok || !payload || payload.ok !== true) {
        const code = failureCode;
        if (code === "PREMIUM_REQUIRED") {
          return { ok: false, code: "PREMIUM_REQUIRED" };
        }
        if (code === "NOT_FOUND") {
          return { ok: false, code: "NOT_FOUND" };
        }
        return {
          ok: false,
          code: mapAiClientCode(response.status, code),
        };
      }

      return payload;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return { ok: false, code: "AI_UNAVAILABLE" };
  }
}
