import { SPEAKING_MAX_SESSION_SECONDS } from "@/lib/billing/plans";
import type { SpeakingStatus } from "@/db/schema";

/** Warn after this long with the learner idle (muted or not speaking). */
export const SPEAKING_INACTIVITY_WARN_MS = 2 * 60 * 1000;

/** After the warning, end the call unless the learner continues. */
export const SPEAKING_INACTIVITY_COUNTDOWN_MS = 15 * 1000;

/**
 * Stream `isSpeaking` blips from ambient noise shorter than this do not
 * reset the inactivity silence window.
 */
export const SPEAKING_ACTIVITY_HOLD_MS = 750;

/** Bound tutor-setup failure: end the Stream call instead of waiting forever. */
export const SPEAKING_TUTOR_SETUP_TIMEOUT_MS = 45 * 1000;

/**
 * Grace after the learner leaves before treating the call as abandoned.
 * Lets a refresh/reconnect keep the same session and deadline.
 */
export const SPEAKING_RECONNECT_GRACE_MS = 45 * 1000;

export function speakingDeadlineAt(
  startedAt: Date | string | null | undefined,
): Date | null {
  if (!startedAt) return null;
  const start =
    startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + SPEAKING_MAX_SESSION_SECONDS * 1000);
}

export function isSpeakingPastDeadline(
  startedAt: Date | string | null | undefined,
  now = new Date(),
): boolean {
  const deadline = speakingDeadlineAt(startedAt);
  if (!deadline) return false;
  return now.getTime() >= deadline.getTime();
}

export function speakingRemainingSeconds(
  startedAt: Date | string | null | undefined,
  now = new Date(),
): number | null {
  const deadline = speakingDeadlineAt(startedAt);
  if (!deadline) return null;
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
}

/**
 * App-level joinability: status must be open and the fair-use deadline
 * (from original startedAt) must not have passed.
 */
export function isSpeakingJoinable(
  status: SpeakingStatus | string,
  startedAt?: Date | string | null,
  now = new Date(),
): boolean {
  if (status !== "upcoming" && status !== "active") return false;
  if (isSpeakingPastDeadline(startedAt, now)) return false;
  return true;
}

export function speakingTokenValiditySeconds(
  startedAt: Date | string | null | undefined,
  now = new Date(),
): number {
  const remaining = speakingRemainingSeconds(startedAt, now);
  if (remaining == null) {
    // Not started yet — allow a full session plus a small buffer.
    return SPEAKING_MAX_SESSION_SECONDS + 120;
  }
  // Bound the JWT to the remaining call budget (+ buffer for cleanup).
  return Math.max(60, Math.min(SPEAKING_MAX_SESSION_SECONDS + 120, remaining + 120));
}

export function speakingElapsedSeconds(
  startedAt: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!startedAt) return null;
  const start =
    startedAt instanceof Date ? startedAt : new Date(startedAt);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
}

/** Compact call clock: `m:ss` or `h:mm:ss`. */
export function formatSpeakingClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
