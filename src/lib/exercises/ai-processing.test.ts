import { describe, expect, it } from "vitest";
import {
  isIndeterminateStage,
  progressForStage,
  UPLOAD_PROGRESS_CAP,
} from "@/lib/exercises/ai-processing";

describe("progressForStage", () => {
  it("maps upload percent into the upload cap", () => {
    expect(progressForStage("uploading", { uploadPercent: 0 })).toBe(0);
    expect(progressForStage("uploading", { uploadPercent: 100 })).toBe(
      UPLOAD_PROGRESS_CAP,
    );
    expect(progressForStage("uploading", { uploadPercent: 50 })).toBe(
      Math.round(UPLOAD_PROGRESS_CAP / 2),
    );
  });

  it("uses fixed weights for discrete stages and null for provider waits", () => {
    expect(progressForStage("extracting")).toBe(40);
    expect(progressForStage("analyzing")).toBe(55);
    expect(progressForStage("preparing")).toBe(10);
    expect(progressForStage("generating")).toBeNull();
    expect(progressForStage("validating")).toBeNull();
    expect(progressForStage("saving")).toBe(90);
    expect(progressForStage("completed")).toBe(100);
    expect(isIndeterminateStage("generating")).toBe(true);
  });

  it("keeps last progress on error instead of jumping to 100", () => {
    expect(progressForStage("error", { lastProgress: 40 })).toBe(40);
    expect(progressForStage("error", { lastProgress: null })).toBeNull();
  });
});
