import { cache } from "react";
import { cookies } from "next/headers";
import {
  AI_PREFERENCES_COOKIE,
  DEFAULT_AI_PREFERENCES,
  mergeAiPreferences,
  parseAiPreferences,
  type AiPreferences,
  type AiPreferencesUpdate,
} from "@/lib/ai/preferences";

export class AiAssistanceDisabledError extends Error {
  readonly code = "AI_DISABLED" as const;

  constructor() {
    super("AI_DISABLED");
    this.name = "AiAssistanceDisabledError";
  }
}

function readCookieValue(raw: string | undefined): AiPreferences {
  if (!raw?.trim()) return { ...DEFAULT_AI_PREFERENCES };
  try {
    return parseAiPreferences(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_AI_PREFERENCES };
  }
}

/**
 * Resolved AI preferences for the current request.
 * Cookie-backed App Preference (device-local, server-readable) — same class as locale.
 */
export const getResolvedAiPreferences = cache(async (): Promise<AiPreferences> => {
  const store = await cookies();
  return readCookieValue(store.get(AI_PREFERENCES_COOKIE)?.value);
});

export async function writeAiPreferences(
  update: AiPreferencesUpdate,
): Promise<AiPreferences> {
  const current = await getResolvedAiPreferences();
  const next = mergeAiPreferences(current, update);
  const store = await cookies();
  store.set(AI_PREFERENCES_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return next;
}

/** Throw when the user has turned AI assistance off. */
export async function requireAiAssistanceEnabled(): Promise<AiPreferences> {
  const prefs = await getResolvedAiPreferences();
  if (!prefs.enabled) {
    throw new AiAssistanceDisabledError();
  }
  return prefs;
}
