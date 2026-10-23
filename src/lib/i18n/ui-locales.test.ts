import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { LANGUAGE_REGION_ORDER, getLanguageByCode } from "@/lib/languages";
import {
  getAllUiLocaleMeta,
  getPopularUiLocales,
  getUiLocaleMeta,
  isRtlLocale,
  localeTextDirection,
} from "@/lib/i18n/ui-locales";

describe("ui locales", () => {
  it("lists only enabled website UI locales", () => {
    const codes = getAllUiLocaleMeta().map((locale) => locale.code);
    expect(codes.sort()).toEqual([...locales].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("lists current locale first among popular picks and respects browser prefs", () => {
    const popular = getPopularUiLocales("vi", ["fr-FR", "de", "xx-YY"]);
    expect(popular[0]?.code).toBe("vi");
    expect(popular.map((item) => item.code)).toEqual(
      expect.arrayContaining(["fr", "de"]),
    );
    expect(popular).toHaveLength(6);
    expect(new Set(popular.map((item) => item.code)).size).toBe(popular.length);
  });

  it("reuses registry native names, flags, and regions", () => {
    for (const locale of locales) {
      const meta = getUiLocaleMeta(locale);
      const language = getLanguageByCode(locale);
      expect(language).toBeDefined();
      expect(meta.label).toBe(language!.name);
      expect(meta.flag).toBe(language!.flagCode);
      expect(LANGUAGE_REGION_ORDER).toContain(meta.region);
      expect(meta.englishName).toBe(language!.englishName);
    }
  });

  it("marks Arabic, Urdu, and Persian as RTL", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("ur")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(localeTextDirection("ar")).toBe("rtl");
    expect(localeTextDirection("en")).toBe("ltr");
    expect(localeTextDirection("vi")).toBe("ltr");
  });
});
