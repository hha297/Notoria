import { beforeProviderError } from "@/lib/ai/bounds";

/**
 * Administrative stop switch for NEW paid provider work.
 * Cleanup / finalize / status reads must not call this (or pass allowCleanup).
 *
 * Configure: AI_PAID_OPS_STOP=1|true|yes
 */
export function isPaidOpsStopped(): boolean {
  const raw = process.env.AI_PAID_OPS_STOP?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function assertPaidOpsAllowed(options?: {
  /** Cleanup / recovery paths that must keep working while new spend is stopped. */
  allowCleanup?: boolean;
}): void {
  if (options?.allowCleanup) return;
  if (isPaidOpsStopped()) {
    throw beforeProviderError(new Error("AI_PAID_OPS_STOPPED"));
  }
}
