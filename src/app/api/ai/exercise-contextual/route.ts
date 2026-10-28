import { NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { authErrorResponse } from "@/lib/auth/http";
import { generateContextualExercises } from "@/lib/exercises/contextual-ai";
import { contextualAiRequestSchema } from "@/lib/exercises/contextual-ai-types";
import { gateAdditionalInstructions } from "@/lib/exercises/additional-instructions-server";
import {
  exerciseJobInProgressResponse,
  runExclusiveExerciseGeneration,
} from "@/lib/exercises/next-set-job";
import { DEFAULT_NEXT_SET_COUNT } from "@/lib/exercises/next-set-fingerprint";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = contextualAiRequestSchema.safeParse(body);
  if (!parsed.success) {
    console.error(
      "contextual exercise AI invalid request",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  let user;
  try {
    user = await getCurrentUserRecord();
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Authentication required" },
      { status: 401 },
    );
  }

  const gated = await gateAdditionalInstructions(parsed.data.additionalInstructions);
  if (!gated.ok) {
    return NextResponse.json({ ok: false, code: gated.code }, { status: 403 });
  }

  const nextSet = parsed.data.nextSet;
  const sessionId = nextSet?.sessionId ?? `oneshot-${user.id}`;
  const sequence = nextSet?.sequence ?? 0;
  const kind =
    parsed.data.exerciseType === "multiple-choice"
      ? "contextual_multiple_choice"
      : "contextual_type_answer";

  try {
    const outcome = await runExclusiveExerciseGeneration({
      userId: user.id,
      regenerate: nextSet?.regenerate === true,
      persistence: nextSet?.persistence,
      fingerprint: {
        kind,
        sessionId,
        sourceIds: parsed.data.words.map((word) => word.id),
        mode: parsed.data.exerciseType,
        difficulty: parsed.data.difficulty,
        language: parsed.data.language ?? null,
        uiLocale: parsed.data.uiLocale ?? null,
        count: Math.min(DEFAULT_NEXT_SET_COUNT, parsed.data.words.length),
        additionalInstructions: gated.text,
        sequence,
      },
      generate: () =>
        generateContextualExercises({
          ...parsed.data,
          additionalInstructions: gated.text,
        }),
    });

    if (outcome.status === "blocked") return outcome.response;
    if (outcome.status === "in_progress") {
      return exerciseJobInProgressResponse();
    }

    return NextResponse.json({
      ok: true,
      exercises: outcome.result,
      reused: outcome.duplicate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("contextual exercise AI failed", message);
    } else {
      console.error("contextual exercise AI failed");
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
