import { NextResponse } from "next/server";
import { AiAccessError, requireAiAccess } from "@/lib/auth/ai-access";
import { generateFillBlankExercises } from "@/lib/exercises/ai";
import { exerciseAiRequestSchema } from "@/lib/exercises/ai-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAiAccess();
  } catch (error) {
    if (error instanceof AiAccessError) {
      return NextResponse.json(
        { ok: false, code: "AI_FORBIDDEN" },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { ok: false, code: "AI_FORBIDDEN" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 500 },
    );
  }

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

  try {
    const exercises = await generateFillBlankExercises(parsed.data);
    return NextResponse.json({ ok: true, exercises });
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
