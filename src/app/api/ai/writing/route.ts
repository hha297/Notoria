import { NextResponse } from "next/server";
import { guardProFeature } from "@/lib/ai/guard-route";
import { analyzeWriting } from "@/lib/writing/ai";
import { writingAiRequestSchema } from "@/lib/writing/ai-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await guardProFeature("ai_writing");
  if (!access.ok) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = writingAiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeWriting(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("writing AI failed", message);
    } else {
      console.error("writing AI failed");
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
