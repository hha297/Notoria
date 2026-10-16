import { createHash } from "crypto";

/**
 * Scoped AI result reuse. Keys include user, operation, content, language,
 * model, and prompt version so results never leak across users or prompts.
 *
 * Safe only for pure functions of the input (e.g. vocab meaning checks).
 * Interactive cancellation does not invalidate shared cache entries needed
 * by another authorized request with the same key.
 */

export const AI_PROMPT_VERSIONS = {
  vocabMeaning: "vocab-meaning-v1",
  vocabSpelling: "vocab-spelling-v1",
  sentenceGloss: "sentence-gloss-v1",
} as const;

export type AiCacheOperation = keyof typeof AI_PROMPT_VERSIONS;

export type AiResultCacheKeyInput = {
  userId: string;
  operation: AiCacheOperation;
  /** Stable digest of the semantic input (not raw PII dumps). */
  contentFingerprint: string;
  language: string;
  model: string;
  promptVersion?: string;
};

const memory = new Map<string, { expiresAt: number; value: unknown }>();
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 500;

export function buildAiResultCacheKey(input: AiResultCacheKeyInput): string {
  const promptVersion =
    input.promptVersion ?? AI_PROMPT_VERSIONS[input.operation];
  const material = [
    input.userId,
    input.operation,
    input.contentFingerprint,
    input.language,
    input.model,
    promptVersion,
  ].join("\0");
  return createHash("sha256").update(material).digest("hex");
}

export function fingerprintAiContent(
  parts: Record<string, string | null | undefined>,
): string {
  const normalized = Object.keys(parts)
    .sort()
    .map((key) => `${key}:${(parts[key] ?? "").trim().toLowerCase()}`)
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

export function getCachedAiResult<T>(key: string): T | null {
  const row = memory.get(key);
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return row.value as T;
}

export function setCachedAiResult(
  key: string,
  value: unknown,
  ttlMs = DEFAULT_TTL_MS,
): void {
  if (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Test helper. */
export function clearAiResultCache(): void {
  memory.clear();
}
