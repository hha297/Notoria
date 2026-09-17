import type {
  ContextualAiExercise,
  ContextualAiRequest,
} from "@/lib/exercises/contextual-ai-types";

export type ContextualAiClientFailure = {
  ok: false;
  code: "AI_FORBIDDEN" | "AI_UNAVAILABLE" | "AI_INVALID_REQUEST" | "AI_EMPTY";
};

export type ContextualAiClientResult =
  | { ok: true; exercises: ContextualAiExercise[] }
  | ContextualAiClientFailure;

export async function requestContextualExerciseAi(
  input: ContextualAiRequest,
): Promise<ContextualAiClientResult> {
  if (input.words.length === 0) {
    return { ok: false, code: "AI_EMPTY" };
  }

  try {
    const response = await fetch("/api/ai/exercise-contextual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as
      | { ok: true; exercises: ContextualAiExercise[] }
      | { ok?: false; code?: ContextualAiClientFailure["code"] };

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
