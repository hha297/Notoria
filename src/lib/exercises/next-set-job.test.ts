import { describe, expect, it, vi } from "vitest";
import { MemoryJobLockStore } from "@/lib/ai/job-lock";

vi.mock("@/lib/ai/guard-route", () => ({
  guardMeteredAi: vi.fn(async () => ({
    ok: true as const,
    preferences: {},
    reservationId: "res-1",
  })),
  settleMeteredAi: vi.fn(async () => undefined),
}));

import { runExclusiveExerciseGeneration } from "@/lib/exercises/next-set-job";

describe("runExclusiveExerciseGeneration", () => {
  it("persists an upcoming result before reporting completion", async () => {
    const store = new MemoryJobLockStore();
    const events: string[] = [];
    const result = await runExclusiveExerciseGeneration({
      userId: "user-persist",
      fingerprint: {
        kind: "fill_blank",
        sessionId: "persist-session",
        sourceIds: ["word-1"],
        count: 1,
        sequence: 1,
      },
      persistence: { scope: "workspace:1:fill_blank", config: "{}" },
      persist: async () => {
        events.push("persisted");
      },
      store,
      generate: async () => {
        events.push("generated");
        return [{ id: "question-1" }];
      },
    });
    events.push("returned");
    expect(result.status).toBe("completed");
    expect(events).toEqual(["generated", "persisted", "returned"]);
  });
  it("dedupes concurrent callers and reuses completed results", async () => {
    const store = new MemoryJobLockStore();

    let runs = 0;
    const generate = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { exercises: [{ id: "1" }] };
    };

    const fingerprint = {
      kind: "fill_blank" as const,
      sessionId: "sess",
      sourceIds: ["a", "b"],
      count: 10,
      sequence: 1,
    };

    const first = runExclusiveExerciseGeneration({
      userId: "u1",
      fingerprint,
      store,
      generate,
    });
    const second = runExclusiveExerciseGeneration({
      userId: "u1",
      fingerprint,
      store,
      generate,
    });

    const [a, b] = await Promise.all([first, second]);
    expect(runs).toBe(1);
    expect([a.status, b.status]).toContain("completed");
    expect(
      [a.status, b.status].includes("in_progress") ||
        (a.status === "completed" && b.status === "completed"),
    ).toBe(true);

    const third = await runExclusiveExerciseGeneration({
      userId: "u1",
      fingerprint,
      store,
      generate,
    });
    expect(third.status).toBe("completed");
    if (third.status === "completed") {
      expect(third.duplicate).toBe(true);
      expect(third.result).toEqual({ exercises: [{ id: "1" }] });
    }
    expect(runs).toBe(1);
  });
});
