import { describe, expect, it } from "vitest";
import {
  filterLanguagesByQuery,
  isSelectableLanguageCode,
  WORKPLACE_LANGUAGES,
} from "@/lib/languages";

describe("learning language onboarding source", () => {
  it("exposes a searchable set of workplace languages with flags", () => {
    expect(WORKPLACE_LANGUAGES.length).toBeGreaterThan(10);
    for (const language of WORKPLACE_LANGUAGES) {
      expect(language.code).toBeTruthy();
      expect(language.name).toBeTruthy();
      expect(language.flagCode).toBeTruthy();
      expect(isSelectableLanguageCode(language.code)).toBe(true);
    }
  });

  it("supports alias and English-name search used by onboarding", () => {
    const matches = filterLanguagesByQuery(WORKPLACE_LANGUAGES, "gilbertese");
    expect(matches.some((language) => language.code === "gil")).toBe(true);
  });

  it("rejects unsupported language codes for new selection", () => {
    expect(isSelectableLanguageCode("xx")).toBe(false);
    expect(isSelectableLanguageCode("aro")).toBe(false);
    expect(isSelectableLanguageCode("")).toBe(false);
  });
});
