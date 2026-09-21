"use server";

import { revalidatePath } from "next/cache";
import {
  aiPreferencesUpdateSchema,
  type AiPreferences,
} from "@/lib/ai/preferences";
import {
  getResolvedAiPreferences,
  writeAiPreferences,
} from "@/lib/ai/preferences-server";
import { getCurrentUserId } from "@/lib/auth/session";

export async function getAiPreferencesAction(): Promise<AiPreferences> {
  await getCurrentUserId();
  return getResolvedAiPreferences();
}

export async function updateAiPreferencesAction(
  input: unknown,
): Promise<AiPreferences> {
  await getCurrentUserId();
  const parsed = aiPreferencesUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("INVALID_AI_PREFERENCES");
  }
  const next = await writeAiPreferences(parsed.data);
  revalidatePath("/settings");
  return next;
}
