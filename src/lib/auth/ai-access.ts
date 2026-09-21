import { getCurrentProAccess, requireProAccess } from "@/lib/auth/pro-access";
import { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";
import {
  AiAssistanceDisabledError,
  getResolvedAiPreferences,
  requireAiAssistanceEnabled,
} from "@/lib/ai/preferences-server";
import type { AiPreferences } from "@/lib/ai/preferences";

export class AiAccessError extends ProAccessError {
  constructor() {
    super("AI_FORBIDDEN");
    this.name = "AiAccessError";
  }
}

export { hasProAccess as hasAiAccess, AiAssistanceDisabledError };

export async function getCurrentAiAccess() {
  const [{ hasProAccess: canUseAi }, prefs] = await Promise.all([
    getCurrentProAccess(),
    getResolvedAiPreferences(),
  ]);
  return {
    canUseAi: canUseAi && prefs.enabled,
    preferences: prefs,
  };
}

/**
 * Pro subscription + AI assistance enabled.
 * Returns resolved preferences for prompt configuration.
 */
export async function requireAiAccess(): Promise<{
  preferences: AiPreferences;
}> {
  try {
    await requireProAccess();
  } catch (error) {
    if (error instanceof ProAccessError) {
      throw new AiAccessError();
    }
    throw error;
  }

  try {
    const preferences = await requireAiAssistanceEnabled();
    return { preferences };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      throw error;
    }
    throw error;
  }
}
