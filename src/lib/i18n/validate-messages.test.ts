import { describe, expect, it } from "vitest";
import { validateMessagesAgainstEnglish } from "@/lib/i18n/validate-messages";

describe("validateMessagesAgainstEnglish", () => {
  it("accepts Bengali message parity with English", () => {
    const result = validateMessagesAgainstEnglish("bn");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Urdu message parity with English", () => {
    const result = validateMessagesAgainstEnglish("ur");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Persian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("fa");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Filipino message parity with English", () => {
    const result = validateMessagesAgainstEnglish("fil");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Malay message parity with English", () => {
    const result = validateMessagesAgainstEnglish("ms");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Estonian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("et");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Latvian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("lv");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Lithuanian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("lt");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Serbian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("sr");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Croatian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("hr");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Slovak message parity with English", () => {
    const result = validateMessagesAgainstEnglish("sk");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts Slovenian message parity with English", () => {
    const result = validateMessagesAgainstEnglish("sl");
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.typeMismatches).toEqual([]);
    expect(result.icuMismatches).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
