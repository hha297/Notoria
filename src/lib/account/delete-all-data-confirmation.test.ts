import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales, type AppLocale } from "@/i18n/config";
import { matchesConfirmPhrase } from "@/lib/account/confirm-phrase";
import {
  DELETE_ACCOUNT_CONFIRM_PHRASE_KEY,
  DELETE_ALL_DATA_CONFIRM_PHRASE_KEY,
} from "@/lib/account/constants";

type ConfirmSection = "clearData" | "delete";

/**
 * Isolated fixture mirroring server-side phrase resolution:
 * load the expected phrase from message files for a validated locale,
 * then compare with the shared matcher (no DB / no purge / no account delete).
 */
function resolveExpectedPhrase(
  locale: AppLocale,
  section: ConfirmSection,
): string {
  const messages = JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as {
    account: {
      clearData: Record<string, string>;
      delete: Record<string, string>;
    };
  };
  const key =
    section === "clearData"
      ? DELETE_ALL_DATA_CONFIRM_PHRASE_KEY
      : DELETE_ACCOUNT_CONFIRM_PHRASE_KEY;
  const phrase = messages.account[section][key];
  if (typeof phrase !== "string" || !phrase.trim()) {
    throw new Error(`Missing account.${section}.${key} for ${locale}`);
  }
  return phrase;
}

function serverAccepts(
  confirmation: string,
  locale: AppLocale,
  section: ConfirmSection,
): boolean {
  if (!locales.includes(locale)) return false;
  const expected = resolveExpectedPhrase(locale, section);
  return matchesConfirmPhrase(confirmation, expected, locale);
}

describe("deleteAllAccountData confirmation (isolated)", () => {
  it("accepts localized phrases for each supported locale", () => {
    for (const locale of locales) {
      const expected = resolveExpectedPhrase(locale, "clearData");
      expect(serverAccepts(expected, locale, "clearData")).toBe(true);
      expect(serverAccepts(`  ${expected}  `, locale, "clearData")).toBe(true);
      expect(serverAccepts("not-the-phrase", locale, "clearData")).toBe(false);
    }
  });

  it("accepts English case variants against the en message file", () => {
    expect(serverAccepts("DELETE ALL DATA", "en", "clearData")).toBe(true);
    expect(serverAccepts("delete all data", "en", "clearData")).toBe(true);
    expect(serverAccepts("Delete All Data", "en", "clearData")).toBe(true);
  });

  it("accepts Turkish upper/lower against the tr message file", () => {
    expect(serverAccepts("TÜM VERİLERİ SİL", "tr", "clearData")).toBe(true);
    expect(serverAccepts("tüm verileri sil", "tr", "clearData")).toBe(true);
    expect(serverAccepts("TUM VERILERI SIL", "tr", "clearData")).toBe(false);
  });

  it("rejects empty confirmation", () => {
    expect(serverAccepts("", "en", "clearData")).toBe(false);
    expect(serverAccepts("   ", "en", "clearData")).toBe(false);
  });
});

describe("deleteAccount confirmation (isolated)", () => {
  it("accepts localized phrases for each supported locale", () => {
    for (const locale of locales) {
      const expected = resolveExpectedPhrase(locale, "delete");
      expect(serverAccepts(expected, locale, "delete")).toBe(true);
      expect(serverAccepts(`  ${expected}  `, locale, "delete")).toBe(true);
      expect(serverAccepts("not-the-phrase", locale, "delete")).toBe(false);
    }
  });

  it("accepts English case variants against the en message file", () => {
    expect(serverAccepts("DELETE MY ACCOUNT", "en", "delete")).toBe(true);
    expect(serverAccepts("delete my account", "en", "delete")).toBe(true);
    expect(serverAccepts("Delete My Account", "en", "delete")).toBe(true);
  });

  it("accepts Vietnamese upper/lower against the vi message file", () => {
    const expected = resolveExpectedPhrase("vi", "delete");
    expect(serverAccepts(expected, "vi", "delete")).toBe(true);
    expect(
      serverAccepts(expected.toLocaleUpperCase("vi"), "vi", "delete"),
    ).toBe(true);
    expect(
      serverAccepts(expected.toLocaleLowerCase("vi"), "vi", "delete"),
    ).toBe(true);
  });

  it("rejects empty confirmation", () => {
    expect(serverAccepts("", "en", "delete")).toBe(false);
    expect(serverAccepts("   ", "en", "delete")).toBe(false);
  });
});
