import { LEARNING_PROMPTS } from "./catalog";
import type { PromptContext, PromptDefinition } from "./types";

export function isPromptEligible(
  prompt: PromptDefinition,
  context: PromptContext,
): boolean {
  if (prompt.requiresWorkspace && !context.hasWorkspace) return false;
  if (prompt.usesLanguage && !context.languageCode) return false;
  if (prompt.timeOfDay && prompt.timeOfDay !== context.timeOfDay) return false;
  return true;
}

export function getEligiblePrompts(
  prompts: readonly PromptDefinition[],
  context: PromptContext,
): PromptDefinition[] {
  return prompts.filter((prompt) => isPromptEligible(prompt, context));
}

/**
 * Pick a random eligible prompt, avoiding the last one and recently shown ids
 * when another choice exists.
 */
export function selectRandomPrompt(
  eligible: readonly PromptDefinition[],
  previousId?: string | null,
  recentIds: readonly string[] = [],
): PromptDefinition | null {
  if (eligible.length === 0) return null;

  const notRecent = eligible.filter(
    (prompt) => prompt.id !== previousId && !recentIds.includes(prompt.id),
  );
  if (notRecent.length > 0) {
    return pick(notRecent);
  }

  const withoutPrevious = previousId
    ? eligible.filter((prompt) => prompt.id !== previousId)
    : eligible;
  const pool = withoutPrevious.length > 0 ? withoutPrevious : eligible;

  return pick(pool);
}

function pick(pool: readonly PromptDefinition[]): PromptDefinition | null {
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function findPromptById(
  id: string,
  prompts: readonly PromptDefinition[] = LEARNING_PROMPTS,
): PromptDefinition | undefined {
  return prompts.find((prompt) => prompt.id === id);
}
