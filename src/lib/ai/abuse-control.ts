/**
 * Server-side request rate limits + per-user concurrency for paid AI surfaces.
 * Applies to Free and unlimited Pro/Premium alike — quotas alone do not stop bursts.
 */

import { consumeRateLimit } from "@/lib/auth/rate-limit";

export const AI_ABUSE_OPERATIONS = [
  "editor_format",
  "sentence_meaning",
  "reading_ocr",
  "content_import",
  "coach_refresh",
  "vocabulary_meaning",
] as const;

export type AiAbuseOperation = (typeof AI_ABUSE_OPERATIONS)[number];

type AbusePolicy = {
  /** Max accepted requests per window (includes rejected concurrent waiters' attempts). */
  limit: number;
  windowMs: number;
  /** Max in-flight provider calls per user for this operation. */
  concurrency: number;
  /** Optional min gap between successful starts (forced Coach refresh). */
  cooldownMs?: number;
};

/**
 * Fair-use abuse caps. Daily quotas still apply where the feature is metered;
 * these limits also bind unlimited plans.
 */
export const AI_ABUSE_POLICY: Record<AiAbuseOperation, AbusePolicy> = {
  editor_format: { limit: 8, windowMs: 60_000, concurrency: 1 },
  sentence_meaning: { limit: 20, windowMs: 60_000, concurrency: 2 },
  reading_ocr: { limit: 6, windowMs: 60_000, concurrency: 1 },
  content_import: { limit: 8, windowMs: 60_000, concurrency: 1 },
  coach_refresh: {
    limit: 4,
    windowMs: 60_000,
    concurrency: 1,
    cooldownMs: 60_000,
  },
  vocabulary_meaning: { limit: 30, windowMs: 60_000, concurrency: 2 },
};

export class RateLimitedError extends Error {
  readonly code = "RATE_LIMITED" as const;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitedError";
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }
}

export class AiBusyError extends Error {
  readonly code = "AI_BUSY" as const;

  constructor() {
    super("AI_BUSY");
    this.name = "AiBusyError";
  }
}

const inFlight = new Map<string, number>();
const lastStartedAt = new Map<string, number>();

function abuseKey(userId: string, operation: AiAbuseOperation) {
  return `${operation}:${userId}`;
}

function concurrencyKey(userId: string, operation: AiAbuseOperation) {
  return `c:${abuseKey(userId, operation)}`;
}

/**
 * Enforce rate + cooldown + concurrency before contacting a paid provider.
 * Call `release` in a finally block after the operation finishes.
 */
export function beginAiAbuseControl(
  userId: string,
  operation: AiAbuseOperation,
): { ok: true; release: () => void } {
  const policy = AI_ABUSE_POLICY[operation];
  const key = abuseKey(userId, operation);
  const now = Date.now();

  if (policy.cooldownMs) {
    const last = lastStartedAt.get(key) ?? 0;
    const waitMs = policy.cooldownMs - (now - last);
    if (waitMs > 0) {
      throw new RateLimitedError(Math.ceil(waitMs / 1000));
    }
  }

  // Concurrency before rate so a busy rejection does not burn a rate token.
  const cKey = concurrencyKey(userId, operation);
  const active = inFlight.get(cKey) ?? 0;
  if (active >= policy.concurrency) {
    throw new AiBusyError();
  }

  const rate = consumeRateLimit({
    key: `ai-abuse:${key}`,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });
  if (!rate.allowed) {
    throw new RateLimitedError(rate.retryAfterSeconds);
  }

  inFlight.set(cKey, active + 1);
  lastStartedAt.set(key, now);

  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      const next = (inFlight.get(cKey) ?? 1) - 1;
      if (next <= 0) inFlight.delete(cKey);
      else inFlight.set(cKey, next);
    },
  };
}

export async function withAiAbuseControl<T>(
  userId: string,
  operation: AiAbuseOperation,
  fn: () => Promise<T>,
): Promise<T> {
  const gate = beginAiAbuseControl(userId, operation);
  try {
    return await fn();
  } finally {
    gate.release();
  }
}

/** Test helper — clears in-memory abuse state. */
export function resetAiAbuseControlForTests() {
  inFlight.clear();
  lastStartedAt.clear();
}

export function isRateLimitedError(error: unknown): error is RateLimitedError {
  return error instanceof RateLimitedError;
}

export function isAiBusyError(error: unknown): error is AiBusyError {
  return error instanceof AiBusyError;
}
