import {
  SPEAKING_INACTIVITY_COUNTDOWN_MS,
  SPEAKING_INACTIVITY_WARN_MS,
} from "@/lib/speaking/lifetime";

export type SpeakingInactivityPhase = "active" | "warning" | "ending";

export type SpeakingInactivityState = {
  phase: SpeakingInactivityPhase;
  /** Seconds remaining on the 15s countdown while warning. */
  countdownSeconds: number;
};

/**
 * Pure inactivity state machine for tests and the call UI.
 *
 * Learner-centric: the silence window advances while the learner is idle
 * (muted mic, or unmuted but not speaking). Tutor `isSpeaking` is intentionally
 * ignored by the call UI — Stream/OpenAI agents often leave that flag sticky.
 * Learner speech or Continue resets to active.
 */
export function nextSpeakingInactivityState(input: {
  now: number;
  silentSince: number | null;
  phase: SpeakingInactivityPhase;
  countdownEndsAt: number | null;
  /** True when the learner is actively speaking (never when mic is muted). */
  learnerSpeaking: boolean;
  /**
   * @deprecated Prefer learner-only activity. Kept for call-site compatibility;
   * treated the same as learner activity when true.
   */
  tutorSpeaking?: boolean;
  continuedAt?: number | null;
}): {
  state: SpeakingInactivityState;
  silentSince: number | null;
  countdownEndsAt: number | null;
  shouldEnd: boolean;
} {
  const hasActivity =
    input.learnerSpeaking || Boolean(input.tutorSpeaking) || Boolean(input.continuedAt);

  if (hasActivity) {
    return {
      state: { phase: "active", countdownSeconds: 0 },
      silentSince: null,
      countdownEndsAt: null,
      shouldEnd: false,
    };
  }

  const silentSince = input.silentSince ?? input.now;
  const silentFor = input.now - silentSince;

  if (input.phase === "warning" || input.phase === "ending") {
    const endsAt =
      input.countdownEndsAt ?? input.now + SPEAKING_INACTIVITY_COUNTDOWN_MS;
    const remainingMs = endsAt - input.now;
    if (remainingMs <= 0) {
      return {
        state: { phase: "ending", countdownSeconds: 0 },
        silentSince,
        countdownEndsAt: endsAt,
        shouldEnd: true,
      };
    }
    return {
      state: {
        phase: "warning",
        countdownSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      },
      silentSince,
      countdownEndsAt: endsAt,
      shouldEnd: false,
    };
  }

  if (silentFor >= SPEAKING_INACTIVITY_WARN_MS) {
    const endsAt = input.now + SPEAKING_INACTIVITY_COUNTDOWN_MS;
    return {
      state: {
        phase: "warning",
        countdownSeconds: Math.ceil(SPEAKING_INACTIVITY_COUNTDOWN_MS / 1000),
      },
      silentSince,
      countdownEndsAt: endsAt,
      shouldEnd: false,
    };
  }

  return {
    state: { phase: "active", countdownSeconds: 0 },
    silentSince,
    countdownEndsAt: null,
    shouldEnd: false,
  };
}
