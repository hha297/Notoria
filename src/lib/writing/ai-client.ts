import type { WritingAiAction, WritingAiResult } from "@/lib/writing/ai-types";

export type WritingAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY";
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
        code:
          payload && "code" in payload && payload.code
            ? payload.code
            : response.status === 403 || response.status === 401
              ? "AI_FORBIDDEN"
              : "AI_UNAVAILABLE",
      };
    }

    return payload;
  } catch {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }
}
