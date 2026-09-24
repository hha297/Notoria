import { NextResponse } from "next/server";
import {
  guardPremiumCoachChat,
  settleMeteredAi,
} from "@/lib/ai/guard-route";
import { getCoachProgress, getLearningCoachData } from "@/lib/billing/coach";
import {
  buildLearningCoachContext,
  coachChatRequestSchema,
  validateCoachChatActions,
} from "@/lib/billing/coach-chat";
import { generateCoachChatReply } from "@/lib/billing/coach-chat-ai";
import { getActiveWorkspace } from "@/lib/workspace";

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

  const parsed = coachChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "AI_INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const access = await guardPremiumCoachChat();
  if (!access.ok) return access.response;

  const workspace = await getActiveWorkspace();
  if (!workspace) {
    await settleMeteredAi(access, false);
    return NextResponse.json(
      { ok: false, code: "AI_FORBIDDEN" },
      { status: 401 },
    );
  }

  try {
    const snapshot = await getLearningCoachData({
      userId: access.user.id,
      workspaceId: workspace.id,
      language: workspace.language,
    });

    const progress = await getCoachProgress({
      userId: access.user.id,
      workspaceId: workspace.id,
      periodDays: 30,
      snapshot,
    });

    const context = buildLearningCoachContext(snapshot, {
      periodDays: progress.periodDays,
      current: progress.current,
      previous: progress.previous,
      comparisons: progress.comparisons,
      notices: progress.notices,
    });
    const ai = await generateCoachChatReply({
      context,
      message: parsed.data.message,
      history: parsed.data.history,
    });

    const actions = validateCoachChatActions(ai.actions ?? []);

    await settleMeteredAi(access, true);
    return NextResponse.json({
      ok: true,
      message: ai.message,
      actions,
      emptyContext: snapshot.empty,
    });
  } catch (error) {
    await settleMeteredAi(access, false);
    const message = error instanceof Error ? error.message : "";
    if (message === "OPENAI_NOT_CONFIGURED" || message === "AI_INVALID_RESPONSE") {
      console.error("coach chat AI failed", message);
    } else if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, code: "AI_FORBIDDEN" },
        { status: 401 },
      );
    } else {
      console.error("coach chat AI failed");
    }
    return NextResponse.json(
      { ok: false, code: "AI_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
