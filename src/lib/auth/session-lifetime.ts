import type { JWT } from "next-auth/jwt";
import {
  authClock,
  sessionLifetimeSeconds,
} from "@/lib/auth/policy";

/**
 * Bind the hard session end time at sign-in, and refuse tokens past that.
 * Auth.js maxAge alone is always the long bound, so unchecked sessions need
 * this cap to end after SESSION_SHORT_MAX_AGE_SECONDS.
 */
export function bindSessionLifetime(
  token: JWT,
  establishing: boolean,
  now = authClock.now(),
): JWT | null {
  if (establishing || token.sessionExpiresAt == null) {
    const lifetimeMs = sessionLifetimeSeconds(token.remember) * 1000;
    if (establishing) {
      token.sessionExpiresAt = now + lifetimeMs;
    } else if (token.sessionExpiresAt == null) {
      const issuedMs =
        typeof token.iat === "number" ? token.iat * 1000 : now;
      token.sessionExpiresAt = issuedMs + lifetimeMs;
    }
  }

  if (
    typeof token.sessionExpiresAt === "number" &&
    now >= token.sessionExpiresAt
  ) {
    return null;
  }

  return token;
}
