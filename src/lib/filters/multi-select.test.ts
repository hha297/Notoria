import { describe, expect, it } from "vitest";
import {
  formatMultiFilterLabel,
  matchesMultiFilter,
  matchesMultiFilterAny,
  multiFilterKey,
  normalizeMultiFilterValue,
  toggleMultiFilterValue,
} from "@/lib/filters/multi-select";

describe("multi-select filters", () => {
  it("toggles values without replacing the selection", () => {
    expect(toggleMultiFilterValue([], "A1")).toEqual(["A1"]);
    expect(toggleMultiFilterValue(["A1"], "A2")).toEqual(["A1", "A2"]);
    expect(toggleMultiFilterValue(["A1", "A2"], "A1")).toEqual(["A2"]);
  });

  it("normalizes legacy single values and all sentinels", () => {
    expect(normalizeMultiFilterValue("all")).toEqual([]);
    expect(normalizeMultiFilterValue("A1")).toEqual(["A1"]);
    expect(normalizeMultiFilterValue(["all", "A1", ""])).toEqual(["A1"]);
  });

  it("uses OR within a filter and treats empty as all", () => {
    expect(matchesMultiFilter([], "verb")).toBe(true);
    expect(matchesMultiFilter(["verb", "noun"], "verb")).toBe(true);
    expect(matchesMultiFilter(["verb"], "noun")).toBe(false);
    expect(matchesMultiFilterAny(["a", "b"], ["c", "b"])).toBe(true);
    expect(matchesMultiFilterAny(["a"], ["c", "b"])).toBe(false);
  });

  it("formats labels with truncation", () => {
    expect(
      formatMultiFilterLabel(
        ["A1", "A2"],
        (value) => value,
        "Level",
        (count) => `${count} selected`,
      ),
    ).toBe("A1, A2");
    expect(
      formatMultiFilterLabel(
        ["A1", "A2", "B1"],
        (value) => value,
        "Level",
        (count) => `${count} selected`,
      ),
    ).toBe("3 selected");
  });

  it("builds a stable key for session cache", () => {
    expect(multiFilterKey(["b", "a"])).toBe("a,b");
  });
});
