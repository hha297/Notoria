import { describe, expect, it } from "vitest";
import {
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

  it("uses fixed stage weights after upload", () => {
    expect(progressForStage("extracting")).toBe(40);
    expect(progressForStage("analyzing")).toBe(55);
    expect(progressForStage("generating")).toBe(75);
    expect(progressForStage("saving")).toBe(92);
    expect(progressForStage("completed")).toBe(100);
  });

  it("keeps last progress on error instead of jumping to 100", () => {
    expect(progressForStage("error", { lastProgress: 75 })).toBe(75);
  });
});
