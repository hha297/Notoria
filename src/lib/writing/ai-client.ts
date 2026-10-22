import { mapAiClientCode } from "@/lib/ai/client-status";
import type { WritingAiAction, WritingAiResult } from "@/lib/writing/ai-types";

export type WritingAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_DISABLED"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY"
    | "AI_QUOTA_EXCEEDED";
};

export type WritingAiClientResult =
  | { ok: true; result: WritingAiResult }
  | WritingAiClientFailure;

export async function requestWritingAi(input: {
  action: WritingAiAction;
  content: string;
  selectedText?: string | null;
  language?: string | null;
  level?: string | null;
  topic?: string | null;
  formality?: string | null;
  title?: string | null;
}): Promise<WritingAiClientResult> {
  if (!input.content.trim()) {
    return { ok: false, code: "AI_EMPTY" };
  }

  try {
    const response = await fetch("/api/ai/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as WritingAiClientResult | {
      ok?: false;
      code?: WritingAiClientFailure["code"];
    };

    if (!response.ok || !payload || payload.ok !== true) {
      return {
        ok: false,
        code: mapAiClientCode(
          response.status,
          payload && "code" in payload ? payload.code : undefined,
          { quotaOn402: true },
        ),
      };
    }

    return payload;
  } catch {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }
}
