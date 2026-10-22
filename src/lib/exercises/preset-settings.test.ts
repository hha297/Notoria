import { describe, expect, it } from "vitest";
import {
  normalizePresetSettings,
  presetSettingsEqual,
  serializePresetSettings,
} from "@/lib/exercises/preset-settings";

describe("exercise preset settings", () => {
  it("normalizes difficulty and ignores unknown fields", () => {
    expect(normalizePresetSettings({ difficulty: "hard", topic: "x" })).toEqual({
      difficulty: "hard",
    });
    expect(normalizePresetSettings(null)).toEqual({});
  });

  it("compares serialized settings for dirty checks", () => {
    expect(
      presetSettingsEqual({ difficulty: "easy" }, { difficulty: "easy" }),
    ).toBe(true);
    expect(
      presetSettingsEqual({ difficulty: "easy" }, { difficulty: "hard" }),
    ).toBe(false);
    expect(serializePresetSettings({})).toEqual({});
  });
});
