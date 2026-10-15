"use server";

import { revalidatePath } from "next/cache";
import {
  beginAiAbuseControl,
  isAiBusyError,
  isRateLimitedError,
} from "@/lib/ai/abuse-control";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getLearningCoach } from "@/lib/billing/coach";
import { getActiveWorkspace } from "@/lib/workspace";

export async function refreshLearningCoach(): Promise<
  | { ok: true }
  | {
      ok: false;
      code: "UNAUTHORIZED" | "RATE_LIMITED" | "AI_BUSY" | "UNAVAILABLE";
      retryAfterSeconds?: number;
    }
> {
  const [user, workspace] = await Promise.all([
    getCurrentUserRecord(),
    getActiveWorkspace(),
  ]);
  if (!user || !workspace) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  let releaseAbuse: (() => void) | undefined;
  try {
    // Cooldown + rate/concurrency before bypassing the note cache / OpenAI.
    const gate = beginAiAbuseControl(user.id, "coach_refresh");
    releaseAbuse = gate.release;

    const result = await getLearningCoach({
      user,
      workspaceId: workspace.id,
      language: workspace.language,
      forceRefresh: true,
    });

    revalidatePath("/coach");

    if (!result.ok) {
      return {
        ok: false,
        code: result.code === "PREMIUM_REQUIRED" ? "UNAUTHORIZED" : "UNAVAILABLE",
      };
    }

    return { ok: true };
  } catch (error) {
    if (isRateLimitedError(error)) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (isAiBusyError(error)) {
      return { ok: false, code: "AI_BUSY" };
    }
    console.error("refreshLearningCoach failed", error);
    return { ok: false, code: "UNAVAILABLE" };
  } finally {
    releaseAbuse?.();
  }
}
