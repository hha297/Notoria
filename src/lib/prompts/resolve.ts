import { LEARNING_PROMPTS } from "./catalog";
import { getEligiblePrompts, selectRandomPrompt } from "./select";
import { persistPromptId, readLastPromptId, readRecentPromptIds } from "./storage";
import type { PromptContext, PromptDefinition } from "./types";

/**
 * Pick a prompt for the welcome modal. Avoids the last shown id and recently
 * used prompts when another option exists.
 */
export function resolveWelcomePrompt(
  context: PromptContext,
): PromptDefinition | null {
  const eligible = getEligiblePrompts(LEARNING_PROMPTS, context);
  if (eligible.length === 0) return null;

  const selected = selectRandomPrompt(
    eligible,
    readLastPromptId(),
    readRecentPromptIds(),
  );
  if (selected) persistPromptId(selected.id);

  return selected;
}
