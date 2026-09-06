import { NextResponse } from "next/server";
import { z } from "zod";
import { AiAccessError, requireAiAccess } from "@/lib/auth/ai-access";
import { glossSentenceMeaning } from "@/lib/exercises/sentence-meaning";
import { locales } from "@/i18n/config";

export const runtime = "nodejs";

const bodySchema = z.object({
  sentence: z.string().min(1).max(600),
  uiLocale: z.enum(locales),
});

export async function POST(request: Request) {
  try {
    await requireAiAccess();
  } catch (error) {
    if (error instanceof AiAccessError) {
      return NextResponse.json({ ok: false, code: "AI_FORBIDDEN" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ ok: false, code: "AI_FORBIDDEN" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "AI_INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const sentenceMeaning = await glossSentenceMeaning({
      sentence: parsed.data.sentence,
      uiLocale: parsed.data.uiLocale,
    });
    return NextResponse.json({ ok: true, sentenceMeaning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("theory sentence meaning failed", message);
    } else {
      console.error("theory sentence meaning failed");
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
