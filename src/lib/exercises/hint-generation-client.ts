import { mapAiClientCode } from "@/lib/ai/client-status";
import type {
  VocabularyMeaningHintRequest,
  VocabularyMeaningHintResultItem,
} from "@/lib/exercises/hint-generation";

export type VocabularyMeaningHintClientFailure = {
  ok: false;
  code:
    | "AI_FORBIDDEN"
    | "AI_DISABLED"
    | "AI_UNAVAILABLE"
    | "AI_INVALID_REQUEST"
    | "AI_EMPTY"
    | "AI_QUOTA_EXCEEDED"
    | "PREMIUM_REQUIRED"
    | "AI_CANCELLED";
};

export type VocabularyMeaningHintClientResult =
  | { ok: true; items: VocabularyMeaningHintResultItem[] }
  | VocabularyMeaningHintClientFailure;

export async function requestVocabularyMeaningHints(
  input: VocabularyMeaningHintRequest,
  options?: { signal?: AbortSignal },
): Promise<VocabularyMeaningHintClientResult> {
  if (input.questions.length === 0) {
    return { ok: false, code: "AI_EMPTY" };
  }

  try {
    const response = await fetch("/api/ai/exercise-hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: options?.signal,
    });

    const payload = (await response.json()) as
      | { ok: true; items: VocabularyMeaningHintResultItem[] }
      | { ok?: false; code?: VocabularyMeaningHintClientFailure["code"] };

    if (!response.ok || !payload || payload.ok !== true) {
      const mapped = mapAiClientCode(
        response.status,
        payload && "code" in payload ? payload.code : undefined,
        { quotaOn402: true },
      );
      return { ok: false, code: mapped };
    }

    return { ok: true, items: payload.items };
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return { ok: false, code: "AI_CANCELLED" };
    }
    return { ok: false, code: "AI_UNAVAILABLE" };
  }
}
