import { NextResponse } from "next/server";
import { isAbortError } from "@/lib/ai/cancellation";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { analyzeVocabularyMeaning } from "@/lib/vocabulary/ai";
import { vocabularyMeaningInputSchema } from "@/lib/vocabulary/ai-types";
import { aiSuggestionsAllowed } from "@/lib/ai/preferences";

export const runtime = "nodejs";

/**
 * Interactive vocab meaning check.
 * Client AbortSignal cancels this request's provider call when supported.
 * Does not cancel another user's (or another tab's) in-flight work with a
 * different reservation — only this HTTP request's signal.
 *
 * OpenAI limitation: abort stops the client wait and may abort the HTTP
 * request to OpenAI; tokens already generated server-side may still bill.
 * Cancellation does not refund quota.
 */
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

  const parsed = vocabularyMeaningInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const access = await guardMeteredAi("ai_vocabulary", {
    abuse: "vocabulary_meaning",
  });
  if (!access.ok) return access.response;

  if (!aiSuggestionsAllowed(access.preferences)) {
    await settleMeteredAi(access, true);
    access.releaseAbuse?.();
    return NextResponse.json({
      ok: true,
      result: {
        type: "meaning",
        word: "",
        meaning: parsed.data.meaning,
        originalMeaning: parsed.data.meaning,
        suggestions: [],
        explanation: "",
      },
    });
  }

  const user = await getCurrentUserRecord();

  try {
    const result = await analyzeVocabularyMeaning(parsed.data, {
      userId: user?.id,
      reservationId: access.reservationId,
      signal: request.signal,
    });
    if (request.signal.aborted) {
      await settleMeteredAi(access, false, new Error("AI_CANCELLED"));
      return NextResponse.json(
        { ok: false, code: "AI_CANCELLED" },
        { status: 499 },
      );
    }
    await settleMeteredAi(access, true);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await settleMeteredAi(access, false, error);
    if (isAbortError(error) || request.signal.aborted) {
      return NextResponse.json(
        { ok: false, code: "AI_CANCELLED" },
        { status: 499 },
      );
    }
    const message = error instanceof Error ? error.message : "";
    if (message === "AI_PAID_OPS_STOPPED") {
      return NextResponse.json(
        { ok: false, code: "AI_PAID_OPS_STOPPED" },
        { status: 503 },
      );
    }
    console.error("vocabulary meaning failed");
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  } finally {
    access.releaseAbuse?.();
  }
}
