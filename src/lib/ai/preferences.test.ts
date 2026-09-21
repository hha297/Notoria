import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PREFERENCES,
  mergeAiPreferences,
  parseAiPreferences,
  shouldAutoApplyAiContentChange,
  shouldConfirmAiContentChange,
  aiSuggestionsAllowed,
  withAiPreferenceInstructions,
  correctionStyleInstruction,
  responseStyleInstruction,
} from "@/lib/ai/preferences";

describe("parseAiPreferences", () => {
  it("returns defaults for invalid input", () => {
    expect(parseAiPreferences(null)).toEqual(DEFAULT_AI_PREFERENCES);
    expect(parseAiPreferences({ enabled: "yes" })).toEqual(
      DEFAULT_AI_PREFERENCES,
    );
  });

  it("accepts a full valid payload", () => {
    const prefs = parseAiPreferences({
      enabled: false,
      responseStyle: "detailed",
      correctionStyle: "minimal",
      suggestionsEnabled: false,
      confirmActions: "always",
    });
    expect(prefs.enabled).toBe(false);
    expect(prefs.responseStyle).toBe("detailed");
    expect(prefs.correctionStyle).toBe("minimal");
    expect(prefs.suggestionsEnabled).toBe(false);
    expect(prefs.confirmActions).toBe("always");
  });
});

describe("mergeAiPreferences", () => {
  it("patches only provided fields", () => {
    const next = mergeAiPreferences(DEFAULT_AI_PREFERENCES, {
      responseStyle: "concise",
    });
    expect(next.responseStyle).toBe("concise");
    expect(next.correctionStyle).toBe("explain");
    expect(next.enabled).toBe(true);
  });
});

describe("withAiPreferenceInstructions", () => {
  const base = "You are a tutor.";

  it("leaves balanced + explain unchanged (default behaviour)", () => {
    const prompt = withAiPreferenceInstructions(base, DEFAULT_AI_PREFERENCES, {
      responseStyle: true,
      correctionStyle: true,
    });
    expect(prompt).toBe(base);
  });

  it("appends concise response style", () => {
    const prefs = { ...DEFAULT_AI_PREFERENCES, responseStyle: "concise" as const };
    const prompt = withAiPreferenceInstructions(base, prefs);
    expect(prompt).toContain("short, direct");
    expect(prompt.startsWith(base)).toBe(true);
  });

  it("appends detailed response style", () => {
    const prefs = {
      ...DEFAULT_AI_PREFERENCES,
      responseStyle: "detailed" as const,
    };
    expect(withAiPreferenceInstructions(base, prefs)).toContain(
      "more explanation",
    );
  });

  it("appends correction style only when requested", () => {
    const prefs = {
      ...DEFAULT_AI_PREFERENCES,
      correctionStyle: "minimal" as const,
    };
    expect(withAiPreferenceInstructions(base, prefs)).toBe(base);
    expect(
      withAiPreferenceInstructions(base, prefs, { correctionStyle: true }),
    ).toContain("brief indication");
  });

  it("produces distinct prompts for each response style", () => {
    const concise = responseStyleInstruction("concise");
    const balanced = responseStyleInstruction("balanced");
    const detailed = responseStyleInstruction("detailed");
    expect(concise).not.toBe(detailed);
    expect(balanced).toBeNull();
    expect(concise).toBeTruthy();
    expect(detailed).toBeTruthy();
  });

  it("produces distinct prompts for each correction style", () => {
    const minimal = correctionStyleInstruction("minimal");
    const explain = correctionStyleInstruction("explain");
    const detailed = correctionStyleInstruction("detailed");
    expect(minimal).not.toBe(detailed);
    expect(explain).toBeNull();
  });
});

describe("confirmation helpers", () => {
  it("requires confirmation for always and content-change", () => {
    expect(
      shouldConfirmAiContentChange({
        ...DEFAULT_AI_PREFERENCES,
        confirmActions: "always",
      }),
    ).toBe(true);
    expect(
      shouldConfirmAiContentChange({
        ...DEFAULT_AI_PREFERENCES,
        confirmActions: "content-change",
      }),
    ).toBe(true);
    expect(
      shouldConfirmAiContentChange({
        ...DEFAULT_AI_PREFERENCES,
        confirmActions: "never",
      }),
    ).toBe(false);
  });

  it("auto-applies only when confirm is never", () => {
    expect(
      shouldAutoApplyAiContentChange({
        ...DEFAULT_AI_PREFERENCES,
        confirmActions: "never",
      }),
    ).toBe(true);
    expect(shouldAutoApplyAiContentChange(DEFAULT_AI_PREFERENCES)).toBe(false);
  });
});

describe("aiSuggestionsAllowed", () => {
  it("requires both AI and suggestions enabled", () => {
    expect(aiSuggestionsAllowed(DEFAULT_AI_PREFERENCES)).toBe(true);
    expect(
      aiSuggestionsAllowed({
        ...DEFAULT_AI_PREFERENCES,
        suggestionsEnabled: false,
      }),
    ).toBe(false);
    expect(
      aiSuggestionsAllowed({ ...DEFAULT_AI_PREFERENCES, enabled: false }),
    ).toBe(false);
  });
});
