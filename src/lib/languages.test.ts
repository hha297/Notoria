import { describe, expect, it } from "vitest";
import {
  filterLanguagesByQuery,
  getLanguageByCode,
  getSelectableLanguages,
  groupLanguagesByRegion,
  isLegacyLanguageCode,
  isSelectableLanguageCode,
  isValidLanguageCode,
  LANGUAGE_REGION_ORDER,
  languageMatchesQuery,
  LEGACY_WORKPLACE_LANGUAGES,
  normalizeLanguageSearch,
  WORKPLACE_LANGUAGES,
} from "@/lib/languages";

const ORIGINAL_CODES = [
  "en",
  "fi",
  "sv",
  "vi",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "no",
  "da",
  "pl",
  "ru",
  "uk",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
  "th",
  "id",
  "tr",
  "el",
  "cs",
  "hu",
  "ro",
] as const;

describe("workplace language catalogue", () => {
  it("keeps unique selectable codes and required fields", () => {
    const codes = WORKPLACE_LANGUAGES.map((language) => language.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(LANGUAGE_REGION_ORDER).toEqual([
      "europe",
      "asia",
      "africa",
      "americas",
      "oceania",
    ]);

    for (const language of WORKPLACE_LANGUAGES) {
      expect(language.code.length).toBeGreaterThanOrEqual(2);
      expect(language.code.length).toBeLessThanOrEqual(16);
      expect(language.name.trim()).toBeTruthy();
      expect(language.englishName.trim()).toBeTruthy();
      expect(language.flagCode.trim()).toBeTruthy();
      expect(language.preview.trim()).toBeTruthy();
      expect(LANGUAGE_REGION_ORDER).toContain(language.region);
      expect(isSelectableLanguageCode(language.code)).toBe(true);
    }
  });

  it("preserves the original 27 selectable languages", () => {
    for (const code of ORIGINAL_CODES) {
      expect(isSelectableLanguageCode(code)).toBe(true);
    }
  });

  it("excludes exhaustive Bolivia/Mali catalogue entries from selection", () => {
    expect(isSelectableLanguageCode("aro")).toBe(false);
    expect(isSelectableLanguageCode("brg")).toBe(false);
    expect(isSelectableLanguageCode("cax")).toBe(false);
    expect(isSelectableLanguageCode("kao")).toBe(false);
    expect(isSelectableLanguageCode("myk")).toBe(false);
    expect(isLegacyLanguageCode("aro")).toBe(true);
    expect(getLanguageByCode("aro")?.englishName).toBe("Araona");
  });

  it("keeps legacy metadata for display without offering it by default", () => {
    expect(LEGACY_WORKPLACE_LANGUAGES.length).toBeGreaterThan(0);
    expect(getSelectableLanguages().some((language) => language.code === "bwg")).toBe(
      false,
    );
    expect(
      getSelectableLanguages({ includeCode: "bwg" }).some(
        (language) => language.code === "bwg",
      ),
    ).toBe(true);
    expect(isValidLanguageCode("bwg")).toBe(true);
  });

  it("assigns regions from representative flag countries", () => {
    expect(getLanguageByCode("en")?.region).toBe("europe");
    expect(getLanguageByCode("es")?.region).toBe("europe");
    expect(getLanguageByCode("fr")?.region).toBe("europe");
    expect(getLanguageByCode("pt")?.region).toBe("europe");
    expect(getLanguageByCode("nl")?.region).toBe("europe");
    expect(getLanguageByCode("ar")?.region).toBe("asia");
    expect(getLanguageByCode("sw")?.region).toBe("africa");
    expect(getLanguageByCode("vi")?.region).toBe("asia");
    expect(getLanguageByCode("ja")?.region).toBe("asia");
  });

  it("matches search by native name, English name, code, and alias", () => {
    const finnish = WORKPLACE_LANGUAGES.find((language) => language.code === "fi")!;
    expect(languageMatchesQuery(finnish, "Suomi")).toBe(true);
    expect(languageMatchesQuery(finnish, "finnish")).toBe(true);
    expect(languageMatchesQuery(finnish, "FI")).toBe(true);

    const haitian = WORKPLACE_LANGUAGES.find((language) => language.code === "ht")!;
    expect(languageMatchesQuery(haitian, "haitian")).toBe(true);
  });

  it("matches case-insensitively and ignores diacritics", () => {
    expect(normalizeLanguageSearch("Español")).toBe("espanol");
    const spanish = WORKPLACE_LANGUAGES.find((language) => language.code === "es")!;
    expect(languageMatchesQuery(spanish, "espanol")).toBe(true);
    expect(languageMatchesQuery(spanish, "ESPAÑOL")).toBe(true);
  });

  it("groups by region without duplicates and hides empty groups", () => {
    const europeOnly = WORKPLACE_LANGUAGES.filter(
      (language) => language.region === "europe",
    );
    const groups = groupLanguagesByRegion(europeOnly);
    expect(groups.map((group) => group.region)).toEqual(["europe"]);
    expect(groups[0]!.languages.length).toBe(europeOnly.length);

    const filtered = filterLanguagesByQuery(WORKPLACE_LANGUAGES, "zzzz-no-match");
    expect(groupLanguagesByRegion(filtered)).toEqual([]);
  });

  it("sorts display names within each region", () => {
    const groups = groupLanguagesByRegion(WORKPLACE_LANGUAGES);
    for (const group of groups) {
      const names = group.languages.map((language) =>
        normalizeLanguageSearch(language.name),
      );
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
  });
});
