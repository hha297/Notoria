import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import {
  displayConfirmPhrase,
  foldConfirmPhrase,
  matchesConfirmPhrase,
  trimConfirmPhrase,
} from "@/lib/account/confirm-phrase";

const messagesRoot = join(process.cwd(), "messages");

function readConfirmPhrase(
  locale: string,
  section: "clearData" | "delete" = "clearData",
): string {
  const json = JSON.parse(
    readFileSync(join(messagesRoot, `${locale}.json`), "utf8"),
  ) as {
    account?: {
      clearData?: { confirmPhrase?: string };
      delete?: { confirmPhrase?: string };
    };
  };
  const phrase = json.account?.[section]?.confirmPhrase;
  if (typeof phrase !== "string" || !phrase.trim()) {
    throw new Error(`Missing account.${section}.confirmPhrase for ${locale}`);
  }
  return phrase;
}

describe("confirm-phrase normalization", () => {
  it("trims whitespace and applies NFC", () => {
    const composed = "café";
    const decomposed = "cafe\u0301";
    expect(trimConfirmPhrase(`  ${decomposed}  `)).toBe(composed);
  });

  it("accepts English upper, lower, and mixed case", () => {
    const expected = "Delete all data";
    expect(matchesConfirmPhrase("DELETE ALL DATA", expected, "en")).toBe(true);
    expect(matchesConfirmPhrase("delete all data", expected, "en")).toBe(true);
    expect(matchesConfirmPhrase("Delete All Data", expected, "en")).toBe(true);
    expect(matchesConfirmPhrase("  Delete all data  ", expected, "en")).toBe(
      true,
    );
  });

  it("rejects incomplete, extra, or wrong English phrases", () => {
    const expected = "Delete all data";
    expect(matchesConfirmPhrase("Delete all", expected, "en")).toBe(false);
    expect(matchesConfirmPhrase("Delete all data now", expected, "en")).toBe(
      false,
    );
    expect(matchesConfirmPhrase("Delete All Dat", expected, "en")).toBe(false);
    expect(matchesConfirmPhrase("", expected, "en")).toBe(false);
  });

  it("does not strip diacritics", () => {
    const expected = "Supprimer toutes les données";
    expect(matchesConfirmPhrase("Supprimer toutes les donnees", expected, "fr")).toBe(
      false,
    );
    expect(
      matchesConfirmPhrase("SUPPRIMER TOUTES LES DONNÉES", expected, "fr"),
    ).toBe(true);
  });

  it("applies Turkish special casing", () => {
    const expected = "Tüm verileri sil";
    // Dotted capital İ folds to i in tr; ASCII I folds to ı.
    expect(matchesConfirmPhrase("TÜM VERİLERİ SİL", expected, "tr")).toBe(true);
    expect(matchesConfirmPhrase("tüm verileri sil", expected, "tr")).toBe(true);
    expect(foldConfirmPhrase("İ", "tr")).toBe("i");
    expect(foldConfirmPhrase("I", "tr")).toBe("ı");
    // English fold of İ is not the same rule as Turkish.
    expect(foldConfirmPhrase("İ", "en")).not.toBe(foldConfirmPhrase("I", "tr"));
  });

  it("compares caseless-script phrases by exact normalized text", () => {
    const zh = "删除全部数据";
    expect(matchesConfirmPhrase(zh, zh, "zh")).toBe(true);
    expect(matchesConfirmPhrase(`  ${zh}  `, zh, "zh")).toBe(true);
    expect(matchesConfirmPhrase("删除全部", zh, "zh")).toBe(false);

    const ja = "すべてのデータを削除";
    expect(matchesConfirmPhrase(ja, ja, "ja")).toBe(true);
    expect(matchesConfirmPhrase("すべてのデータを消す", ja, "ja")).toBe(false);
  });

  it("accepts canonically equivalent Unicode input", () => {
    const expected = "café test";
    const nfd = "cafe\u0301 test";
    expect(matchesConfirmPhrase(nfd, expected, "en")).toBe(true);
    expect(displayConfirmPhrase(nfd, "en")).toBe(
      displayConfirmPhrase(expected, "en"),
    );
  });

  it("uppercases for display where casing exists", () => {
    expect(displayConfirmPhrase("Delete all data", "en")).toBe("DELETE ALL DATA");
    expect(displayConfirmPhrase("Tüm verileri sil", "tr")).toBe("TÜM VERİLERİ SİL");
    expect(displayConfirmPhrase("删除全部数据", "zh")).toBe("删除全部数据");
  });

  it("keeps Greek tonos instead of lossy uppercase", () => {
    const phrase = "Διαγραφή όλων των δεδομένων";
    expect(displayConfirmPhrase(phrase, "el")).toBe(phrase);
    expect(matchesConfirmPhrase(phrase, phrase, "el")).toBe(true);
    expect(
      matchesConfirmPhrase(phrase.toLocaleLowerCase("el"), phrase, "el"),
    ).toBe(true);
  });
});

describe("confirmPhrase coverage", () => {
  for (const section of ["clearData", "delete"] as const) {
    it(`defines a non-empty account.${section}.confirmPhrase for every AppLocale`, () => {
      for (const locale of locales) {
        const phrase = readConfirmPhrase(locale, section);
        expect(phrase.length).toBeGreaterThan(0);
        expect(matchesConfirmPhrase(phrase, phrase, locale)).toBe(true);
        expect(
          matchesConfirmPhrase(
            displayConfirmPhrase(phrase, locale),
            phrase,
            locale,
          ),
        ).toBe(true);
      }
    });
  }

  it("has confirmPhrase keys in every AppLocale message file", () => {
    const files = new Set(
      readdirSync(messagesRoot)
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.replace(/\.json$/, "")),
    );
    for (const locale of locales) {
      expect(files.has(locale)).toBe(true);
      expect(readConfirmPhrase(locale, "clearData").length).toBeGreaterThan(0);
      expect(readConfirmPhrase(locale, "delete").length).toBeGreaterThan(0);
    }
  });

  it("accepts mixed-case variants for every casing locale (clearData + delete)", () => {
    for (const section of ["clearData", "delete"] as const) {
      const casingLocales = locales.filter((locale) => {
        const phrase = readConfirmPhrase(locale, section);
        const upper = phrase.toLocaleUpperCase(locale);
        return (
          phrase !== upper &&
          foldConfirmPhrase(upper, locale) === foldConfirmPhrase(phrase, locale)
        );
      });

      expect(casingLocales.length).toBeGreaterThan(10);

      for (const locale of casingLocales) {
        const phrase = readConfirmPhrase(locale, section);
        const upper = displayConfirmPhrase(phrase, locale);
        const lower = phrase.toLocaleLowerCase(locale);
        expect(matchesConfirmPhrase(upper, phrase, locale)).toBe(true);
        expect(matchesConfirmPhrase(lower, phrase, locale)).toBe(true);
      }
    }
  });
});
