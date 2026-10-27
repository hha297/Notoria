import type OpenAI from "openai";
import {
  AI_SDK_MAX_RETRIES,
  afterProviderError,
  beforeProviderError,
} from "@/lib/ai/bounds";
import {
  AiCancelledError,
  isAbortError,
  mergeAbortSignals,
  throwIfAborted,
  toCancelledError,
} from "@/lib/ai/cancellation";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { assertPaidOpsAllowed } from "@/lib/ai/paid-ops";
import {
  estimateUsdFromTokens,
  trackAiProviderEvent,
  type AiProviderOutcome,
} from "@/lib/ai/telemetry";

export type ChatCompletionCallInput = {
  operation: string;
  feature?: string;
  userId?: string | null;
  reservationId?: string | null;
  workKind?: "interactive" | "background" | "cleanup";
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  /** When true, skip stop-switch (cleanup only). */
  allowCleanup?: boolean;
  body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
};

export type ChatCompletionCallResult = {
  completion: OpenAI.Chat.Completions.ChatCompletion;
  attempt: number;
  elapsedMs: number;
  fromCache?: boolean;
};

/**
 * OpenAI chat.completions with stop-switch, abort, and telemetry.
 * Provider cancellation: OpenAI Node SDK honors `signal` when supported;
 * once tokens stream/complete server-side, cancel may not fully avoid spend.
 */
export async function runChatCompletion(
  input: ChatCompletionCallInput,
): Promise<ChatCompletionCallResult> {
  assertPaidOpsAllowed({ allowCleanup: input.allowCleanup });
  throwIfAborted(input.signal);

  const model = input.model ?? input.body.model ?? "gpt-5.6-luna";
  const client = requireOpenAiClient({
    timeoutMs: input.timeoutMs,
    maxRetries: input.maxRetries ?? AI_SDK_MAX_RETRIES,
  });

  const started = Date.now();
  let attempt = 0;
  let outcome: AiProviderOutcome = "ok";
  let completion: OpenAI.Chat.Completions.ChatCompletion | null = null;
  let lastError: unknown;

  try {
    attempt = 1;
    throwIfAborted(input.signal);
    completion = await client.chat.completions.create(
      { ...input.body, model },
      { signal: input.signal },
    );
    return {
      completion,
      attempt,
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    lastError = error;
    if (isAbortError(error) || input.signal?.aborted) {
      outcome = "cancelled";
      throw error instanceof AiCancelledError
        ? error
        : new AiCancelledError();
    }
    outcome = "error";
    throw toCancelledError(error);
  } finally {
    const usage = completion?.usage;
    const totalTokens = usage?.total_tokens ?? null;
    trackAiProviderEvent({
      userId: input.userId,
      operation: input.operation,
      feature: input.feature,
      model: String(model),
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens,
      elapsedMs: Date.now() - started,
      retryCount: Math.max(0, attempt - 1),
      outcome: input.signal?.aborted && outcome === "ok" ? "cancelled" : outcome,
      providerRequestId: completion?.id ?? null,
      costEstimateUsd: estimateUsdFromTokens(totalTokens),
      reservationId: input.reservationId,
      workKind: input.workKind ?? "interactive",
    });
    // Ensure we don't accidentally use lastError without surfacing — already thrown.
    void lastError;
  }
}

export function mapProviderStartError(error: unknown): never {
  if (error instanceof Error && error.message === "AI_PAID_OPS_STOPPED") {
    throw beforeProviderError(error);
  }
  if (error instanceof Error && error.message === "OPENAI_NOT_CONFIGURED") {
    throw beforeProviderError(error);
  }
  throw afterProviderError(error);
}

export { mergeAbortSignals, throwIfAborted };
