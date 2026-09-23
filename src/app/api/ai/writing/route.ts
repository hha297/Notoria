import { NextResponse } from "next/server";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import { analyzeWriting } from "@/lib/writing/ai";
import { writingAiRequestSchema } from "@/lib/writing/ai-types";

export const runtime = "nodejs";

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

  const parsed = writingAiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const access = await guardMeteredAi("ai_writing");
  if (!access.ok) return access.response;

  try {
    const result = await analyzeWriting(parsed.data);
    await settleMeteredAi(access, true);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await settleMeteredAi(access, false);
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
