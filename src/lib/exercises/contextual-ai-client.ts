import { mapAiClientCode } from "@/lib/ai/client-status";
import type {
  ContextualAiExercise,
  ContextualAiRequest,
} from "@/lib/exercises/contextual-ai-types";
import {
  NEXT_SET_POLL_INTERVAL_MS,
  NEXT_SET_POLL_MAX_MS,
} from "@/lib/exercises/next-set-fingerprint";

export type ContextualAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_DISABLED"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY"
    | "AI_QUOTA_EXCEEDED"
    | "PREMIUM_REQUIRED"
    | "AI_JOB_IN_PROGRESS";
};

export type ContextualAiClientResult =
  | { ok: true; exercises: ContextualAiExercise[]; reused?: boolean }
  | ContextualAiClientFailure;

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

export async function requestContextualExerciseAi(
  input: ContextualAiRequest,
  options?: { signal?: AbortSignal; poll?: boolean },
): Promise<ContextualAiClientResult> {
  if (input.words.length === 0) {
    return { ok: false, code: "AI_EMPTY" };
  }

  const poll = options?.poll !== false;
  const started = Date.now();

  try {
    for (;;) {
      if (options?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const response = await fetch("/api/ai/exercise-contextual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: options?.signal,
      });

      const payload = (await response.json()) as
        | { ok: true; exercises: ContextualAiExercise[]; reused?: boolean }
        | { ok?: false; code?: ContextualAiClientFailure["code"] };

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
