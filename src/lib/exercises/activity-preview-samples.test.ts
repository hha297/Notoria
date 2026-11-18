import { describe, expect, it } from "vitest";
import { getActivityPreviewSamples } from "@/lib/exercises/activity-preview-samples";

describe("getActivityPreviewSamples", () => {
  it("uses Finnish learning samples for fi workspaces", () => {
    const samples = getActivityPreviewSamples("fi");
    expect(samples.fillBlankBefore).toContain("Minulla");
    expect(samples.flashcardWord).toBe("suomalainen");
    expect(samples.mcPromptWord).toBe("suomalainen");
    expect(samples.matchLeft).toBe("talo");
  });

  it("uses English learning samples for en workspaces", () => {
    const samples = getActivityPreviewSamples("en");
    expect(samples.fillBlankBefore).toBe("I have a new ");
    expect(samples.flashcardWord).toBe("beautiful");
    expect(samples.mcPromptWord).toBe("beautiful");
    expect(samples.matchLeft).toBe("house");
  });

  it("falls back to English for unknown codes", () => {
    expect(getActivityPreviewSamples("zz").fillBlankBefore).toBe(
      "I have a new ",
    );
  });
});
