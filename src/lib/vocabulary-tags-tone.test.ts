import { describe, expect, it } from "vitest";
import { getTagTone } from "@/lib/vocabulary-tags";

describe("getTagTone", () => {
  it("maps CEFR difficulty tags", () => {
    expect(getTagTone("a2")).toBe("difficulty");
    expect(getTagTone("c1")).toBe("difficulty");
  });

  it("maps topic and grammar tags", () => {
    expect(getTagTone("home_housing")).toBe("topic");
    expect(getTagTone("idiom")).toBe("grammar");
  });

  it("maps custom tags without inventing per-tag hues", () => {
    expect(getTagTone("custom:Kitchen")).toBe("custom");
  });

  it("falls back to neutral when unassigned", () => {
    expect(getTagTone("")).toBe("neutral");
    expect(getTagTone("not-a-real-tag")).toBe("neutral");
    expect(getTagTone("custom:")).toBe("neutral");
  });

  it("maps learning-status tags", () => {
    expect(getTagTone("mastered")).toBe("learningStatus");
  });
});
