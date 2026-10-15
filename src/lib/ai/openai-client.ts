import OpenAI from "openai";
import { AI_SDK_MAX_RETRIES } from "@/lib/ai/bounds";

export function createOpenAiClient(input?: {
  timeoutMs?: number;
  maxRetries?: number;
  requireKey?: boolean;
}): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    if (input?.requireKey === false) return null;
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  return new OpenAI({
    apiKey,
    timeout: input?.timeoutMs ?? 60_000,
    maxRetries: input?.maxRetries ?? AI_SDK_MAX_RETRIES,
  });
}

export function requireOpenAiClient(input?: {
  timeoutMs?: number;
  maxRetries?: number;
}): OpenAI {
  const client = createOpenAiClient({ ...input, requireKey: true });
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");
  return client;
}
