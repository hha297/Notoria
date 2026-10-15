import { AiCostError, afterProviderError } from "@/lib/ai/bounds";

/**
 * Client or supersession cancelled work after a provider call may already
 * have started. Cancellation does NOT refund quota.
 */
export class AiCancelledError extends AiCostError {
  readonly code = "AI_CANCELLED" as const;

  constructor(message = "AI_CANCELLED") {
    super("after_provider", message);
    this.name = "AiCancelledError";
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof AiCancelledError) return true;
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  if (error.message === "AI_CANCELLED" || error.message === "AI_DEADLINE_EXCEEDED") {
    return true;
  }
  return false;
}

export function throwIfAborted(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    throw new AiCancelledError();
  }
}

/** Merge deadline + client signals. Aborting one client must use a per-request signal. */
export function mergeAbortSignals(
  ...signals: Array<AbortSignal | undefined | null>
): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => Boolean(s));
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(active);
  }
  const controller = new AbortController();
  const onAbort = () => {
    controller.abort();
    for (const signal of active) {
      signal.removeEventListener("abort", onAbort);
    }
  };
  for (const signal of active) {
    if (signal.aborted) {
      onAbort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export function toCancelledError(error: unknown): AiCostError {
  if (error instanceof AiCostError) return error;
  if (isAbortError(error)) return new AiCancelledError();
  return afterProviderError(error);
}
