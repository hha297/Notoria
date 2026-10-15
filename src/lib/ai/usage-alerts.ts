import type { AiProviderEventInput } from "@/lib/ai/telemetry";

/**
 * Configurable usage alerts (env thresholds). Logs only — does not stop work
 * (use AI_PAID_OPS_STOP for that). Estimates ≠ invoices.
 *
 * AI_USAGE_ALERT_TOKENS_DAILY — warn when a single event's totalTokens exceeds
 * AI_USAGE_ALERT_ELAPSED_MS — warn when a single call exceeds this duration
 */

function readPositiveInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export async function evaluateUsageAlert(
  input: AiProviderEventInput,
): Promise<void> {
  const tokenCeiling = readPositiveInt("AI_USAGE_ALERT_TOKENS_DAILY");
  const elapsedCeiling = readPositiveInt("AI_USAGE_ALERT_ELAPSED_MS");

  if (
    tokenCeiling != null &&
    input.totalTokens != null &&
    input.totalTokens >= tokenCeiling
  ) {
    console.warn("[ai-usage-alert] token threshold (estimate, not invoice)", {
      operation: input.operation,
      totalTokens: input.totalTokens,
      threshold: tokenCeiling,
      costEstimateUsd: input.costEstimateUsd ?? null,
      costIsEstimate: true,
    });
  }

  if (
    elapsedCeiling != null &&
    input.elapsedMs != null &&
    input.elapsedMs >= elapsedCeiling
  ) {
    console.warn("[ai-usage-alert] elapsed threshold", {
      operation: input.operation,
      elapsedMs: input.elapsedMs,
      threshold: elapsedCeiling,
    });
  }
}
