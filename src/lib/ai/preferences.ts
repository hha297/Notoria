import { z } from "zod";

export const AI_RESPONSE_STYLES = ["concise", "balanced", "detailed"] as const;
export type AiResponseStyle = (typeof AI_RESPONSE_STYLES)[number];

export const AI_CORRECTION_STYLES = ["minimal", "explain", "detailed"] as const;
export type AiCorrectionStyle = (typeof AI_CORRECTION_STYLES)[number];

export const AI_CONFIRM_ACTIONS = ["always", "content-change", "never"] as const;
export type AiConfirmActions = (typeof AI_CONFIRM_ACTIONS)[number];

/**
 * App-wide AI behaviour preferences.
 * Defaults match Notoria's existing AI tone so unset users see no behaviour change.
 */
export type AiPreferences = {
  enabled: boolean;
  responseStyle: AiResponseStyle;
  correctionStyle: AiCorrectionStyle;
  suggestionsEnabled: boolean;
  confirmActions: AiConfirmActions;
};

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  enabled: true,
  responseStyle: "balanced",
  correctionStyle: "explain",
  suggestionsEnabled: true,
  confirmActions: "content-change",
};

export const aiPreferencesSchema = z.object({
  enabled: z.boolean(),
  responseStyle: z.enum(AI_RESPONSE_STYLES),
  correctionStyle: z.enum(AI_CORRECTION_STYLES),
  suggestionsEnabled: z.boolean(),
  confirmActions: z.enum(AI_CONFIRM_ACTIONS),
});

export const aiPreferencesUpdateSchema = aiPreferencesSchema.partial();

export type AiPreferencesUpdate = z.infer<typeof aiPreferencesUpdateSchema>;

export function parseAiPreferences(value: unknown): AiPreferences {
  const parsed = aiPreferencesSchema.safeParse(value);
  if (!parsed.success) {
    return { ...DEFAULT_AI_PREFERENCES };
  }
  return parsed.data;
}

export function mergeAiPreferences(
  current: AiPreferences,
  update: AiPreferencesUpdate,
): AiPreferences {
  return parseAiPreferences({ ...current, ...update });
}

/** Cookie / local payload key — server-readable App Preference. */
export const AI_PREFERENCES_COOKIE = "notoria-ai-preferences";

export type AiPreferenceInstructionOptions = {
  /** Affects general verbosity of AI replies. Default true. */
  responseStyle?: boolean;
  /** Affects language-correction / feedback explanation depth. Default false. */
  correctionStyle?: boolean;
};

/**
 * Append preference instructions only when they differ from defaults,
 * so Balanced / Explain mistakes preserve today's AI behaviour.
 */
export function withAiPreferenceInstructions(
  systemPrompt: string,
  prefs: AiPreferences,
  options: AiPreferenceInstructionOptions = {},
): string {
  const parts: string[] = [systemPrompt.trimEnd()];
  const useResponse = options.responseStyle !== false;
  const useCorrection = options.correctionStyle === true;

  if (useResponse) {
    const line = responseStyleInstruction(prefs.responseStyle);
    if (line) parts.push(line);
  }
  if (useCorrection) {
    const line = correctionStyleInstruction(prefs.correctionStyle);
    if (line) parts.push(line);
  }

  return parts.join("\n\n");
}

export function responseStyleInstruction(
  style: AiResponseStyle,
): string | null {
  switch (style) {
    case "concise":
      return "Response style preference: Prefer short, direct explanations and avoid unnecessary elaboration.";
    case "detailed":
      return "Response style preference: Provide more explanation, context, and reasoning where appropriate.";
    case "balanced":
    default:
      return null;
  }
}

export function correctionStyleInstruction(
  style: AiCorrectionStyle,
): string | null {
  switch (style) {
    case "minimal":
      return "Correction style preference: Prefer the corrected version and a brief indication of the main mistake(s). Avoid long explanations.";
    case "detailed":
      return "Correction style preference: Provide more complete explanations, including relevant grammar/usage context and useful examples where appropriate.";
    case "explain":
    default:
      return null;
  }
}

/** Whether AI may run proactive suggestion requests (vocab spelling/meaning). */
export function aiSuggestionsAllowed(prefs: AiPreferences): boolean {
  return prefs.enabled && prefs.suggestionsEnabled;
}

/**
 * Whether the UI should ask before applying an AI result that mutates content.
 * Informational AI (check-only feedback) should not use this.
 */
export function shouldConfirmAiContentChange(prefs: AiPreferences): boolean {
  return prefs.confirmActions !== "never";
}

/** Auto-apply content mutations without an Accept/Apply step. */
export function shouldAutoApplyAiContentChange(prefs: AiPreferences): boolean {
  return prefs.confirmActions === "never";
}
