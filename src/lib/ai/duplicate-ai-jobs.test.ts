import { describe, expect, it } from "vitest";
import {
  AI_JOBS,
  MemoryJobLockStore,
  runExclusiveJob,
} from "@/lib/ai/job-lock";
import {
  speakingTranscriptPlan,
  tutorConnectPlan,
} from "@/lib/speaking/job-policy";
import { saveSpeakingTranscriptOnce } from "@/lib/speaking/transcript-job";
import { claimSpeakingTutor } from "@/lib/speaking/tutor-claim";

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("exclusive AI jobs", () => {
  it("starts one provider job when two requests arrive together", async () => {
    const store = new MemoryJobLockStore();
    const gate = deferred();
    let calls = 0;

    const first = runExclusiveJob({
      store,
      operation: AI_JOBS.listeningTranscribe,
      subjectId: "lesson-1",
      heartbeat: false,
      run: async () => {
        calls += 1;
        await gate.promise;
        return { id: "lesson-1" };
      },
    });
    const second = runExclusiveJob({
      store,
      operation: AI_JOBS.listeningTranscribe,
      subjectId: "lesson-1",
      heartbeat: false,
      run: async () => {
        calls += 1;
        return { id: "lesson-1" };
      },
    });

    await expect(second).resolves.toEqual({
      status: "in_progress",
      duplicate: true,
    });
    expect(calls).toBe(1);

    gate.resolve();
    await expect(first).resolves.toMatchObject({
      status: "completed",
      duplicate: false,
      result: { id: "lesson-1" },
    });
    expect(calls).toBe(1);
  });

  it("returns the existing result for a duplicate and runs again only when regenerating", async () => {
    const store = new MemoryJobLockStore();
    let calls = 0;
    const run = () =>
      runExclusiveJob({
        store,
        operation: AI_JOBS.listeningGenerate,
        subjectId: "lesson-1:FILL_BLANK",
        heartbeat: false,
        run: async () => {
          calls += 1;
          return { count: calls };
        },
      });

    await expect(run()).resolves.toMatchObject({
      status: "completed",
      duplicate: false,
      result: { count: 1 },
    });
    await expect(run()).resolves.toMatchObject({
      status: "completed",
      duplicate: true,
      result: { count: 1 },
    });
    expect(calls).toBe(1);

    const regenerated = await runExclusiveJob({
      store,
      operation: AI_JOBS.listeningGenerate,
      subjectId: "lesson-1:FILL_BLANK",
      regenerate: true,
      heartbeat: false,
      run: async () => {
        calls += 1;
        return { count: calls };
      },
    });
    expect(regenerated).toMatchObject({
      status: "completed",
      duplicate: false,
      result: { count: 2 },
    });
  });

  it("lets a new worker recover an expired lock and ignores the crashed worker", async () => {
    const store = new MemoryJobLockStore();
    const start = new Date("2026-01-01T00:00:00.000Z");
    const crashed = await store.claim({
      operation: AI_JOBS.readingOcr,
      subjectId: "doc-1",
      ownerId: "worker-a",
      now: start,
      ttlMs: 1_000,
      regenerate: false,
    });
    expect(crashed.acquired).toBe(true);

    let calls = 0;
    const recovered = await runExclusiveJob({
      store,
      operation: AI_JOBS.readingOcr,
      subjectId: "doc-1",
      now: new Date(start.getTime() + 1_001),
      ttlMs: 1_000,
      heartbeat: false,
      run: async () => {
        calls += 1;
        return { text: "recovered" };
      },
    });

    expect(recovered).toMatchObject({
      status: "completed",
      duplicate: false,
      result: { text: "recovered" },
    });
    expect(calls).toBe(1);

    const staleWrite = await store.complete({
      operation: AI_JOBS.readingOcr,
      subjectId: "doc-1",
      ownerId: "worker-a",
      now: new Date(start.getTime() + 1_500),
      result: { text: "stale" },
    });
    expect(staleWrite).toBe(false);
    await expect(store.read(AI_JOBS.readingOcr, "doc-1")).resolves.toMatchObject({
      result: { text: "recovered" },
    });
  });

  it("reclaims a failed lock without waiting for expiry", async () => {
    const store = new MemoryJobLockStore();
    const now = new Date("2026-01-01T00:00:00.000Z");
    await expect(
      runExclusiveJob({
        store,
        operation: AI_JOBS.readingGrade,
        subjectId: "attempt-1",
        now,
        heartbeat: false,
        run: async () => {
          throw new Error("provider down");
        },
      }),
    ).rejects.toThrow("provider down");

    let calls = 0;
    const retry = await runExclusiveJob({
      store,
      operation: AI_JOBS.readingGrade,
      subjectId: "attempt-1",
      now,
      heartbeat: false,
      run: async () => {
        calls += 1;
        return { ok: true };
      },
    });
    expect(retry.status).toBe("completed");
    expect(calls).toBe(1);
  });
});

describe("speaking tutor ownership", () => {
  it("lets join and webhook share one tutor across callers", async () => {
    const store = new MemoryJobLockStore();
    const now = new Date("2026-01-01T00:00:00.000Z");
    let connections = 0;

    async function join() {
      const claim = await claimSpeakingTutor({
        status: "upcoming",
        localConnected: false,
        sessionId: "session-1",
        store,
        now,
      });
      if (claim.action !== "connect") return claim.action;
      connections += 1;
      return "connected" as const;
    }

    await expect(join()).resolves.toBe("connected");
    await expect(join()).resolves.toBe("already_connected");
    expect(connections).toBe(1);
    expect(tutorConnectPlan({ status: "processing", localConnected: false })).toBe(
      "reject",
    );
  });

  it("recovers tutor ownership after the owning worker expires", async () => {
    const store = new MemoryJobLockStore();
    const start = new Date("2026-01-01T00:00:00.000Z");
    const first = await claimSpeakingTutor({
      status: "active",
      localConnected: false,
      sessionId: "session-2",
      store,
      now: start,
      ttlMs: 1_000,
    });
    expect(first.action).toBe("connect");
    if (first.action !== "connect") return;

    const second = await claimSpeakingTutor({
      status: "active",
      localConnected: false,
      sessionId: "session-2",
      store,
      now: new Date(start.getTime() + 1_001),
      ttlMs: 1_000,
    });
    expect(second.action).toBe("connect");
    if (second.action !== "connect") return;

    await expect(first.release()).resolves.toBe(false);
    const lock = await store.read(AI_JOBS.speakingTutor, "session-2");
    expect(lock?.ownerId).toBe(second.ownerId);
    expect(lock?.status).toBe("running");
  });
});

describe("speaking transcript summaries", () => {
  it("does not summarize a replayed transcript event", async () => {
    const store = new MemoryJobLockStore();
    let calls = 0;
    const summarize = async () => {
      calls += 1;
      return "summary";
    };

    const first = await saveSpeakingTranscriptOnce({
      hasSummary: false,
      incomingText: "Learner: hello",
      subjectId: "session-1",
      store,
      summarize,
    });
    const replay = await saveSpeakingTranscriptOnce({
      hasSummary: true,
      incomingText: "Learner: hello",
      subjectId: "session-1",
      store,
      summarize,
    });

    expect(first.action).toBe("summarized");
    expect(replay.action).toBe("kept");
    expect(calls).toBe(1);
    expect(
      speakingTranscriptPlan({ hasSummary: true, incomingText: "Learner: hello" }),
    ).toBe("keep");
  });

  it("summarizes once when the same transcript event is delivered twice before completion", async () => {
    const store = new MemoryJobLockStore();
    const gate = deferred();
    let calls = 0;

    const first = saveSpeakingTranscriptOnce({
      hasSummary: false,
      incomingText: "Learner: hello",
      subjectId: "session-3",
      store,
      summarize: async () => {
        calls += 1;
        await gate.promise;
        return "summary";
      },
    });
    const second = saveSpeakingTranscriptOnce({
      hasSummary: false,
      incomingText: "Learner: hello",
      subjectId: "session-3",
      store,
      summarize: async () => {
        calls += 1;
        return "other";
      },
    });

    await expect(second).resolves.toEqual({ action: "in_progress" });
    expect(calls).toBe(1);
    gate.resolve();
    await expect(first).resolves.toMatchObject({
      action: "summarized",
      result: "summary",
    });
    expect(calls).toBe(1);
  });

  it("finishes an empty transcript without calling the model", async () => {
    let calls = 0;
    const outcome = await saveSpeakingTranscriptOnce({
      hasSummary: false,
      incomingText: "   ",
      subjectId: "session-4",
      store: new MemoryJobLockStore(),
      summarize: async () => {
        calls += 1;
        return "unused";
      },
    });
    expect(outcome.action).toBe("empty");
    expect(calls).toBe(0);
  });
});
