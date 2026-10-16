import { NextResponse } from "next/server";
import { z } from "zod";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import { glossSentenceMeaning } from "@/lib/exercises/sentence-meaning";
import { locales } from "@/i18n/config";

export const runtime = "nodejs";

const bodySchema = z.object({
  sentence: z.string().min(1).max(600),
  uiLocale: z.enum(locales),
});

export async function POST(request: Request) {
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

  // Shares `ai_exercise` daily quota; abuse limits also bind unlimited plans.
  const access = await guardMeteredAi("ai_exercise", {
    abuse: "sentence_meaning",
  });
  if (!access.ok) return access.response;

  try {
    if (request.signal.aborted) {
      await settleMeteredAi(access, false, new Error("AI_CANCELLED"));
      return NextResponse.json({ ok: false, code: "AI_CANCELLED" }, { status: 499 });
    }
    const sentenceMeaning = await glossSentenceMeaning({
      sentence: parsed.data.sentence,
      uiLocale: parsed.data.uiLocale,
      signal: request.signal,
    });
    if (request.signal.aborted) {
      await settleMeteredAi(access, false, new Error("AI_CANCELLED"));
      return NextResponse.json({ ok: false, code: "AI_CANCELLED" }, { status: 499 });
    }
    await settleMeteredAi(access, true);
    return NextResponse.json({ ok: true, sentenceMeaning });
  } catch (error) {
    await settleMeteredAi(access, false, error);
    const message = error instanceof Error ? error.message : "";
    if (message === "AI_CANCELLED" || request.signal.aborted) {
      return NextResponse.json({ ok: false, code: "AI_CANCELLED" }, { status: 499 });
    }
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("theory sentence meaning failed", message);
    } else {
      console.error("theory sentence meaning failed");
    }
    return NextResponse.json({ ok: false, code: "AI_UNAVAILABLE" }, { status: 503 });
  } finally {
    access.releaseAbuse?.();
  }
}
