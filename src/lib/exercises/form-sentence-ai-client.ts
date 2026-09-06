import type {
  FormSentenceAiRequest,
  FormSentenceAiResult,
} from "@/lib/exercises/form-sentence-ai-types";

export type FormSentenceAiClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY";
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
