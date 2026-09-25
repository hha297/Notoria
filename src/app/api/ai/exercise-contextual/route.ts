import { NextResponse } from "next/server";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import { generateContextualExercises } from "@/lib/exercises/contextual-ai";
import { contextualAiRequestSchema } from "@/lib/exercises/contextual-ai-types";

export const runtime = "nodejs";

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

  const access = await guardMeteredAi("ai_exercise");
  if (!access.ok) return access.response;

  try {
    const exercises = await generateContextualExercises(parsed.data);
    await settleMeteredAi(access, true);
    return NextResponse.json({ ok: true, exercises });
  } catch (error) {
    await settleMeteredAi(access, false);
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("contextual exercise AI failed", message);
    } else {
      console.error("contextual exercise AI failed");
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
