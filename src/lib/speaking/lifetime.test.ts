import { describe, expect, it } from "vitest";
import { SPEAKING_MAX_SESSION_SECONDS } from "@/lib/billing/plans";
import {
  formatSpeakingClock,
  isSpeakingJoinable,
  isSpeakingPastDeadline,
  speakingDeadlineAt,
  speakingElapsedSeconds,
  speakingRemainingSeconds,
  speakingTokenValiditySeconds,
} from "@/lib/speaking/lifetime";
import { nextSpeakingInactivityState } from "@/lib/speaking/inactivity";
import { tutorConnectPlan } from "@/lib/speaking/job-policy";

describe("speaking lifetime", () => {
  const started = new Date("2026-10-15T10:00:00.000Z");

  it("derives deadline from original startedAt", () => {
    const deadline = speakingDeadlineAt(started);
    expect(deadline?.toISOString()).toBe(
      new Date(started.getTime() + SPEAKING_MAX_SESSION_SECONDS * 1000).toISOString(),
    );
  });

  it("blocks join after deadline while keeping upcoming joinable before start", () => {
    expect(isSpeakingJoinable("upcoming", null)).toBe(true);
    expect(isSpeakingJoinable("active", started, started)).toBe(true);

    const after = new Date(
      started.getTime() + SPEAKING_MAX_SESSION_SECONDS * 1000 + 1,
    );
    expect(isSpeakingPastDeadline(started, after)).toBe(true);
    expect(isSpeakingJoinable("active", started, after)).toBe(false);
    expect(isSpeakingJoinable("completed", started, started)).toBe(false);
  });

  it("bounds token validity to remaining deadline", () => {
    const mid = new Date(started.getTime() + 10 * 60 * 1000);
    const validity = speakingTokenValiditySeconds(started, mid);
    const remaining = speakingRemainingSeconds(started, mid)!;
    expect(validity).toBe(remaining + 120);
    expect(speakingTokenValiditySeconds(null)).toBe(
      SPEAKING_MAX_SESSION_SECONDS + 120,
    );
  });

  it("formats elapsed call time from startedAt", () => {
    const mid = new Date(started.getTime() + 125 * 1000);
    expect(speakingElapsedSeconds(started, mid)).toBe(125);
    expect(formatSpeakingClock(125)).toBe("2:05");
    expect(formatSpeakingClock(3723)).toBe("1:02:03");
  });

  it("rejects tutor connect after deadline", () => {
    const after = new Date(
      started.getTime() + SPEAKING_MAX_SESSION_SECONDS * 1000 + 1,
    );
    expect(
      tutorConnectPlan({
        status: "active",
        localConnected: false,
        startedAt: started,
        now: after,
      }),
    ).toBe("reject");
  });
});

describe("speaking inactivity", () => {
  const warnAt = 2 * 60 * 1000;

  it("stays active while the learner is speaking", () => {
    const withLearner = nextSpeakingInactivityState({
      now: warnAt + 1,
      silentSince: 0,
      phase: "active",
      countdownEndsAt: null,
      learnerSpeaking: true,
    });
    expect(withLearner.state.phase).toBe("active");
    expect(withLearner.silentSince).toBeNull();
  });

  it("advances while the learner is idle even if a sticky tutorSpeaking flag is ignored by UI", () => {
    // Call UI no longer feeds tutorSpeaking; idle learner still warns.
    const warn = nextSpeakingInactivityState({
      now: warnAt,
      silentSince: 0,
      phase: "active",
      countdownEndsAt: null,
      learnerSpeaking: false,
    });
    expect(warn.state.phase).toBe("warning");
    expect(warn.state.countdownSeconds).toBe(15);
  });

  it("warns after 2 minutes of learner idle then ends after countdown", () => {
    const warn = nextSpeakingInactivityState({
      now: warnAt,
      silentSince: 0,
      phase: "active",
      countdownEndsAt: null,
      learnerSpeaking: false,
    });
    expect(warn.state.phase).toBe("warning");
    expect(warn.state.countdownSeconds).toBe(15);

    const end = nextSpeakingInactivityState({
      now: warn.countdownEndsAt!,
      silentSince: warn.silentSince,
      phase: "warning",
      countdownEndsAt: warn.countdownEndsAt,
      learnerSpeaking: false,
    });
    expect(end.shouldEnd).toBe(true);
  });

  it("Continue / learner speech resets the silence window", () => {
    const warned = nextSpeakingInactivityState({
      now: warnAt,
      silentSince: 0,
      phase: "active",
      countdownEndsAt: null,
      learnerSpeaking: false,
    });
    const continued = nextSpeakingInactivityState({
      now: warnAt + 5_000,
      silentSince: warned.silentSince,
      phase: "warning",
      countdownEndsAt: warned.countdownEndsAt,
      learnerSpeaking: true,
    });
    expect(continued.state.phase).toBe("active");
    expect(continued.silentSince).toBeNull();
  });
});
