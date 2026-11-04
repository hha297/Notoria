import { NextResponse } from "next/server";
import { isAbortError } from "@/lib/ai/cancellation";
import { guardMeteredAi, settleMeteredAi } from "@/lib/ai/guard-route";
import { aiSuggestionsAllowed } from "@/lib/ai/preferences";
import {
  generateVocabularyMeaningHints,
  vocabularyMeaningHintRequestSchema,
} from "@/lib/exercises/hint-generation";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Batch vocabulary-meaning hints for deterministic multiple-choice sets.
 * Request may include correctOption for generation only; the response returns
 * { id, hints } and never echoes answers or model reasoning.
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

  const parsed = vocabularyMeaningHintRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const access = await guardMeteredAi("ai_exercise", {
    abuse: "sentence_meaning",
  });
  if (!access.ok) return access.response;

  if (!aiSuggestionsAllowed(access.preferences)) {
    await settleMeteredAi(access, true);
    access.releaseAbuse?.();
    return NextResponse.json({
      ok: true,
      items: parsed.data.questions.map((question) => ({
        id: question.id,
        hints: [] as string[],
      })),
    });
  }

  try {
    const items = await generateVocabularyMeaningHints(parsed.data, {
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
    // Strip to learner-facing fields only — never echo correctOption.
    return NextResponse.json({
      ok: true,
      items: items.map((item) => ({ id: item.id, hints: item.hints })),
    });
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
    if (message === "OPENAI_NOT_CONFIGURED") {
      return NextResponse.json(
        { ok: false, code: "AI_UNAVAILABLE" },
        { status: 503 },
      );
    }
    console.error("exercise hints failed");
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  } finally {
    access.releaseAbuse?.();
  }
}
