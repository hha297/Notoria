/**
 * Provider-usage telemetry (NOT quota). Failures here must never re-run paid work.
 *
 * Cost fields are ESTIMATES only — not Stripe/provider invoices.
 */

export type AiProviderOutcome =
  | "ok"
  | "error"
  | "cancelled"
  | "deadline"
  | "cache_hit"
  | "stopped";

export type AiProviderEventInput = {
  userId?: string | null;
  operation: string;
  feature?: string | null;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  elapsedMs?: number | null;
  retryCount?: number | null;
  outcome: AiProviderOutcome;
  providerRequestId?: string | null;
  providerJobId?: string | null;
  /** Speaking call duration in seconds — separate from text-generation tokens. */
  speakingDurationSeconds?: number | null;
  /**
   * Rough USD estimate (display). Persisted as micros. Never an invoice.
   */
  costEstimateUsd?: number | null;
  reservationId?: string | null;
  /** Interactive vs intentional background job. */
  workKind?: "interactive" | "background" | "cleanup";
};

/** Very rough gpt-4o-mini-ish heuristic — ESTIMATE only, not billing. */
export function estimateUsdFromTokens(
  totalTokens: number | null | undefined,
): number | null {
  if (totalTokens == null || totalTokens <= 0) return null;
  return Math.round((totalTokens / 1_000_000) * 0.2 * 1_000_000) / 1_000_000;
}

export function usdToMicros(usd: number | null | undefined): number | null {
  if (usd == null || !Number.isFinite(usd)) return null;
  return Math.round(usd * 1_000_000);
}

export async function recordAiProviderEvent(
  input: AiProviderEventInput,
): Promise<void> {
  try {
    const estimateUsd =
      input.costEstimateUsd ?? estimateUsdFromTokens(input.totalTokens);
    // Lazy DB import so unit tests can use estimate helpers without DATABASE_URL.
    const { db } = await import("@/db");
    const { aiProviderEvents } = await import("@/db/schema");
    await db.insert(aiProviderEvents).values({
      userId: input.userId ?? null,
      operation: input.operation,
      feature: input.feature ?? null,
      model: input.model ?? null,
      promptTokens: input.promptTokens ?? null,
      completionTokens: input.completionTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      elapsedMs: input.elapsedMs ?? null,
      retryCount: input.retryCount ?? 0,
      outcome: input.outcome,
      providerRequestId: input.providerRequestId ?? null,
      providerJobId: input.providerJobId ?? null,
      speakingDurationSeconds: input.speakingDurationSeconds ?? null,
      costEstimateMicros: usdToMicros(estimateUsd),
      costIsEstimate: true,
      reservationId: input.reservationId ?? null,
      workKind: input.workKind ?? "interactive",
    });
    void checkUsageAlerts({ ...input, costEstimateUsd: estimateUsd }).catch(
      () => {
        // Alerts must never affect paid execution.
      },
    );
  } catch (error) {
    console.error("ai provider telemetry failed", {
      operation: input.operation,
      outcome: input.outcome,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** Fire-and-forget wrapper — never throws to callers. */
export function trackAiProviderEvent(input: AiProviderEventInput): void {
  void recordAiProviderEvent(input);
}

async function checkUsageAlerts(input: AiProviderEventInput): Promise<void> {
  const { evaluateUsageAlert } = await import("@/lib/ai/usage-alerts");
  await evaluateUsageAlert(input);
}
