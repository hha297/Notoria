import { mapAiClientCode } from "@/lib/ai/client-status";
import type {
  FormSentenceAiRequest,
  FormSentenceAiResult,
} from "@/lib/exercises/form-sentence-ai-types";

export type FormSentenceAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_DISABLED"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY"
    | "AI_QUOTA_EXCEEDED";
};

export type FormSentenceAiClientResult =
  | ({ ok: true } & FormSentenceAiResult)
  | FormSentenceAiClientFailure;

export async function requestFormSentenceAi(
  input: FormSentenceAiRequest,
): Promise<FormSentenceAiClientResult> {
  if (!input.sentence.trim()) {
    return { ok: false, code: "AI_EMPTY" };
  }

  try {
    const response = await fetch("/api/ai/form-sentence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as
      | ({ ok: true } & FormSentenceAiResult)
      | { ok?: false; code?: FormSentenceAiClientFailure["code"] };

    if (!response.ok || !payload || payload.ok !== true) {
      return {
        ok: false,
        code: mapAiClientCode(
          response.status,
          payload && "code" in payload ? payload.code : undefined,
        ),
      };
    }

    return payload;
  } catch {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }
}
