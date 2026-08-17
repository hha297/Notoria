import type {
  ExerciseAiFillBlank,
  ExerciseAiRequest,
} from "@/lib/exercises/ai-types";

export type ExerciseAiClientFailure = {
  ok: false;
  code: "AI_FORBIDDEN" | "AI_UNAVAILABLE" | "AI_INVALID_REQUEST" | "AI_EMPTY";
};

export type ExerciseAiClientResult =
  | { ok: true; exercises: ExerciseAiFillBlank[] }
  | ExerciseAiClientFailure;

export async function requestExerciseAi(
  input: ExerciseAiRequest,
): Promise<ExerciseAiClientResult> {
  if (input.words.length === 0) {
    return { ok: false, code: "AI_EMPTY" };
  }

  try {
    const response = await fetch("/api/ai/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as
      | { ok: true; exercises: ExerciseAiFillBlank[] }
      | { ok?: false; code?: ExerciseAiClientFailure["code"] };

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
