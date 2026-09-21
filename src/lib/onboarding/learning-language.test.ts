import { describe, expect, it } from "vitest";
import {
  isValidLanguageCode,
  WORKPLACE_LANGUAGES,
} from "@/lib/languages";

describe("learning language onboarding source", () => {
  it("exposes a searchable set of workplace languages with flags", () => {
    expect(WORKPLACE_LANGUAGES.length).toBeGreaterThan(10);
    for (const language of WORKPLACE_LANGUAGES) {
      expect(language.code).toBeTruthy();
      expect(language.name).toBeTruthy();
      expect(language.flagCode).toBeTruthy();
      expect(isValidLanguageCode(language.code)).toBe(true);
    }
  });

  it("rejects unsupported language codes", () => {
    expect(isValidLanguageCode("xx")).toBe(false);
    expect(isValidLanguageCode("")).toBe(false);
  });
});
