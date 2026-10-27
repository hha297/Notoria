import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMessagesAgainstEnglish } from "@/lib/i18n/validate-messages";

describe("validateMessagesAgainstEnglish", () => {
  const locales = readdirSync(join(process.cwd(), "messages"))
    .filter((file) => file.endsWith(".json") && file !== "en.json")
    .map((file) => file.replace(/\.json$/, ""));

  it.each(locales)("accepts %s message parity with English", (locale) => {
    expect(validateMessagesAgainstEnglish(locale)).toEqual({
      locale,
      ok: true,
      missing: [],
      extra: [],
      typeMismatches: [],
      icuMismatches: [],
    });
  });
});
