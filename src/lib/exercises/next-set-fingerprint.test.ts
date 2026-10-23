import { describe, expect, it } from "vitest";
import {
  buildExerciseNextSetSubject,
  fingerprintExerciseNextSet,
} from "@/lib/exercises/next-set-fingerprint";

describe("fingerprintExerciseNextSet", () => {
  it("is stable for equivalent inputs regardless of source id order", () => {
    const a = fingerprintExerciseNextSet({
      kind: "fill_blank",
      sessionId: "sess-1",
      sourceIds: ["b", "a"],
      mode: "fill-in-blank",
      difficulty: "medium",
      language: "fi",
      uiLocale: "en",
      count: 10,
      additionalInstructions: "focus on cases",
      sequence: 1,
    });
    const b = fingerprintExerciseNextSet({
      kind: "fill_blank",
      sessionId: "sess-1",
      sourceIds: ["a", "b"],
      mode: "fill-in-blank",
      difficulty: "medium",
      language: "fi",
      uiLocale: "en",
      count: 10,
      additionalInstructions: "focus on cases",
      sequence: 1,
    });
    expect(a).toBe(b);
  });

  it("changes when configuration or sequence changes", () => {
    const base = {
      kind: "theory" as const,
      sessionId: "sess-1",
      sourceIds: ["theory-1"],
      sourceRevisions: ["2026-01-01"],
      mode: "theory",
      count: 10,
      sequence: 0,
    };
    const first = fingerprintExerciseNextSet(base);
    const nextSeq = fingerprintExerciseNextSet({ ...base, sequence: 1 });
    const nextRev = fingerprintExerciseNextSet({
      ...base,
      sourceRevisions: ["2026-01-02"],
    });
    expect(first).not.toBe(nextSeq);
    expect(first).not.toBe(nextRev);
  });

  it("builds a user-scoped subject id", () => {
    const fingerprint = fingerprintExerciseNextSet({
      kind: "fill_blank",
      sessionId: "s",
      sourceIds: ["w1"],
      count: 10,
      sequence: 0,
    });
    expect(buildExerciseNextSetSubject("user-1", fingerprint)).toBe(
      `exercise-next:user-1:${fingerprint}`,
    );
  });
});
