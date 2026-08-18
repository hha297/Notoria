import { describe, expect, it } from "vitest";
import {
  isSpeakingTutorUserId,
  speakingTutorUserId,
  streamTranscriptionLanguage,
} from "@/lib/speaking/stream";

describe("speaking stream helpers", () => {
  it("maps workspace languages Stream can transcribe", () => {
    expect(streamTranscriptionLanguage("fi")).toBe("fi");
    expect(streamTranscriptionLanguage("en")).toBe("en");
    expect(streamTranscriptionLanguage("vi")).toBe("auto");
  });

  it("identifies the tutor Stream user", () => {
    const id = speakingTutorUserId("abc");
    expect(id).toBe("tutor-abc");
    expect(isSpeakingTutorUserId(id)).toBe(true);
    expect(isSpeakingTutorUserId("user-1")).toBe(false);
  });
});
