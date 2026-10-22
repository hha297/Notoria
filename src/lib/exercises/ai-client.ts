import { mapAiClientCode } from "@/lib/ai/client-status";
import type {
  ExerciseAiFillBlank,
  ExerciseAiRequest,
} from "@/lib/exercises/ai-types";

export type ExerciseAiClientFailure = {
  ok: false;
  code: "AI_FORBIDDEN" | "AI_DISABLED" | "AI_UNAVAILABLE" | "AI_INVALID_REQUEST" | "AI_EMPTY" | "AI_QUOTA_EXCEEDED";
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
