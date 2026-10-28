import { NextResponse } from "next/server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { authErrorResponse } from "@/lib/auth/http";
import { generateFillBlankExercises } from "@/lib/exercises/ai";
import { exerciseAiRequestSchema } from "@/lib/exercises/ai-types";
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
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = exerciseAiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
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

  const gated = await gateAdditionalInstructions(
    parsed.data.additionalInstructions,
  );
  if (!gated.ok) {
    return NextResponse.json({ ok: false, code: gated.code }, { status: 403 });
  }

  const nextSet = parsed.data.nextSet;
  const sessionId = nextSet?.sessionId ?? `oneshot-${user.id}`;
  const sequence = nextSet?.sequence ?? 0;

  try {
    const outcome = await runExclusiveExerciseGeneration({
      userId: user.id,
      regenerate: nextSet?.regenerate === true,
      persistence: nextSet?.persistence,
      fingerprint: {
        kind: "fill_blank",
        sessionId,
        sourceIds: parsed.data.words.map((word) => word.id),
        mode: "fill-in-blank",
        difficulty: parsed.data.difficulty ?? null,
        language: parsed.data.language ?? null,
        uiLocale: parsed.data.uiLocale ?? null,
        count: Math.min(DEFAULT_NEXT_SET_COUNT, parsed.data.words.length),
        additionalInstructions: gated.text,
        sequence,
      },
      generate: () =>
        generateFillBlankExercises({
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
      console.error("exercise AI failed", message);
    } else {
      console.error("exercise AI failed");
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
