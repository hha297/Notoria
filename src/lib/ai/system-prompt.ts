import {
  withAiPreferenceInstructions,
  type AiPreferenceInstructionOptions,
} from "@/lib/ai/preferences";
import { getResolvedAiPreferences } from "@/lib/ai/preferences-server";

/** Resolve current prefs and decorate a system prompt for an AI call. */
export async function aiSystemPrompt(
  base: string,
  options?: AiPreferenceInstructionOptions,
): Promise<string> {
  const prefs = await getResolvedAiPreferences();
  return withAiPreferenceInstructions(base, prefs, options);
}
