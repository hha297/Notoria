"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getLearningCoach } from "@/lib/billing/coach";
import { getActiveWorkspace } from "@/lib/workspace";

export async function refreshLearningCoach() {
  const [user, workspace] = await Promise.all([
    getCurrentUserRecord(),
    getActiveWorkspace(),
  ]);
  if (!user || !workspace) {
    return { ok: false as const, code: "UNAUTHORIZED" as const };
  }

  const result = await getLearningCoach({
    user,
    workspaceId: workspace.id,
    language: workspace.language,
    forceRefresh: true,
  });

  revalidatePath("/coach");

  if (!result.ok) {
    return { ok: false as const, code: result.code };
  }

  return { ok: true as const };
}
