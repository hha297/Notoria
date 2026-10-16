import { describe, expect, it } from "vitest";
import {
  MEANING_USAGE_IDS,
  canonicalizeMeaningUsageId,
  normalizeMeaningUsageLabels,
  resolveMeaningUsageLabel,
  sharedUsageIdsOverlapWordTags,
} from "@/lib/vocabulary/meaning-usage";

describe("meaning usage labels", () => {
  it("reuses shared word-level usage ids", () => {
    expect(sharedUsageIdsOverlapWordTags()).toBe(true);
    expect(canonicalizeMeaningUsageId("colloquial")).toBe("spoken");
    expect(canonicalizeMeaningUsageId("idiomatic")).toBe("idiom");
    expect(canonicalizeMeaningUsageId("slang")).toBe("slang");
    expect(canonicalizeMeaningUsageId("figurative")).toBe("figurative");
    expect(canonicalizeMeaningUsageId("academic")).toBeNull();
  });

  it("normalizes, de-dupes, and drops unknown labels", () => {
    expect(
      normalizeMeaningUsageLabels([
        "Slang",
        "colloquial",
        "figurative",
        "nonsense",
        "slang",
      ]),
    ).toEqual(["spoken", "slang", "figurative"]);
    expect(normalizeMeaningUsageLabels([])).toEqual([]);
    expect(normalizeMeaningUsageLabels(undefined)).toEqual([]);
  });

  it("keeps picker order from MEANING_USAGE_IDS", () => {
    const shuffled = ["idiom", "formal", "technical"] as const;
    expect(normalizeMeaningUsageLabels([...shuffled])).toEqual(
      MEANING_USAGE_IDS.filter((id) => shuffled.includes(id as never)),
    );
  });

  it("resolves display labels via tags translator keys", () => {
    const labels: Record<string, string> = {
      "grammar.slang": "Slang",
      "meaningUsage.figurative": "Figurative",
    };
    expect(resolveMeaningUsageLabel("slang", (key) => labels[key] ?? key)).toBe(
      "Slang",
    );
    expect(
      resolveMeaningUsageLabel("figurative", (key) => labels[key] ?? key),
    ).toBe("Figurative");
  });
});
