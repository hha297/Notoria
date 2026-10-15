import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { shouldRefundUsage } from "@/lib/ai/bounds";
import {
  AiCancelledError,
  isAbortError,
  mergeAbortSignals,
  throwIfAborted,
} from "@/lib/ai/cancellation";
import { assertPaidOpsAllowed, isPaidOpsStopped } from "@/lib/ai/paid-ops";
import {
  buildAiResultCacheKey,
  clearAiResultCache,
  fingerprintAiContent,
  getCachedAiResult,
  setCachedAiResult,
} from "@/lib/ai/result-cache";
import { estimateUsdFromTokens, usdToMicros } from "@/lib/ai/telemetry";
import {
  isPartialMeaningInput,
  meaningCheckDebounceMs,
} from "@/lib/vocabulary/meaning-ready";

describe("cancellation", () => {
  it("does not refund quota on cancel", () => {
    expect(shouldRefundUsage(new AiCancelledError())).toBe(false);
    expect(shouldRefundUsage(new Error("AI_CANCELLED"))).toBe(false);
  });

  it("throwIfAborted raises AiCancelledError", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(AiCancelledError);
  });

  it("mergeAbortSignals aborts when any child aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const merged = mergeAbortSignals(a.signal, b.signal)!;
    expect(merged.aborted).toBe(false);
    b.abort();
    expect(merged.aborted).toBe(true);
  });

  it("isAbortError recognizes AbortError", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
  });
});

describe("paid ops stop switch", () => {
  const original = process.env.AI_PAID_OPS_STOP;

  afterEach(() => {
    if (original === undefined) delete process.env.AI_PAID_OPS_STOP;
    else process.env.AI_PAID_OPS_STOP = original;
  });

  it("blocks new paid work when enabled", () => {
    process.env.AI_PAID_OPS_STOP = "true";
    expect(isPaidOpsStopped()).toBe(true);
    expect(() => assertPaidOpsAllowed()).toThrow(/AI_PAID_OPS_STOPPED/);
  });

  it("allows cleanup while stopped", () => {
    process.env.AI_PAID_OPS_STOP = "1";
    expect(() => assertPaidOpsAllowed({ allowCleanup: true })).not.toThrow();
  });
});

describe("result cache isolation", () => {
  beforeEach(() => clearAiResultCache());

  it("scopes keys by user, language, model, and content", () => {
    const fingerprint = fingerprintAiContent({
      word: "talo",
      meaning: "house",
    });
    const a = buildAiResultCacheKey({
      userId: "user-a",
      operation: "vocabMeaning",
      contentFingerprint: fingerprint,
      language: "fi",
      model: "gpt-4o-mini",
    });
    const b = buildAiResultCacheKey({
      userId: "user-b",
      operation: "vocabMeaning",
      contentFingerprint: fingerprint,
      language: "fi",
      model: "gpt-4o-mini",
    });
    expect(a).not.toBe(b);
    setCachedAiResult(a, { ok: true });
    expect(getCachedAiResult(a)).toEqual({ ok: true });
    expect(getCachedAiResult(b)).toBeNull();
  });
});

describe("vocab partial debounce", () => {
  it("treats short / mid-edit input as partial", () => {
    expect(isPartialMeaningInput("ho")).toBe(true);
    expect(isPartialMeaningInput("hou")).toBe(true);
    expect(isPartialMeaningInput("house")).toBe(false);
    expect(isPartialMeaningInput("a house")).toBe(false);
    expect(isPartialMeaningInput("well-")).toBe(true);
  });

  it("uses longer debounce for partial input", () => {
    expect(meaningCheckDebounceMs("ho", 500, 1200)).toBe(1200);
    expect(meaningCheckDebounceMs("house", 500, 1200)).toBe(500);
  });
});

describe("telemetry estimates", () => {
  it("labels cost as estimate micros, not invoice", () => {
    const usd = estimateUsdFromTokens(1_000_000);
    expect(usd).toBeCloseTo(0.2);
    expect(usdToMicros(usd)).toBe(200_000);
  });

  it("record failure does not rethrow into paid path", async () => {
    const { recordAiProviderEvent } = await import("@/lib/ai/telemetry");
    // Force insert path to run; DB may be unavailable in unit tests — must not throw.
    await expect(
      recordAiProviderEvent({
        operation: "test.noop",
        outcome: "error",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("follow-up suppression", () => {
  it("aborted signal blocks starting further work", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(AiCancelledError);
  });
});
