import { NextResponse } from "next/server";
import { guardAiRoute } from "@/lib/ai/guard-route";
import { generateContextualExercises } from "@/lib/exercises/contextual-ai";
import { contextualAiRequestSchema } from "@/lib/exercises/contextual-ai-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await guardAiRoute();
  if (!access.ok) return access.response;

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

  try {
    const exercises = await generateContextualExercises(parsed.data);
    return NextResponse.json({ ok: true, exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("contextual exercise AI failed", message);
    } else {
      console.error("contextual exercise AI failed");
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
