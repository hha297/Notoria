/**
 * Session and metadata-refresh policy.
 *
 * Persistence (Remember me):
 * - Checked: persistent cookie and hard session cap of SESSION_MAX_AGE_SECONDS
 *   (30 days) from sign-in.
 * - Unchecked (default): persistent cookie and hard session cap of
 *   SESSION_SHORT_MAX_AGE_SECONDS (24 hours) from sign-in.
 * Auth.js maxAge is the longer bound so Remember me can reach 30 days. Short
 * sessions rewrite the cookie Max-Age to 24 hours and refuse the JWT after
 * sessionExpiresAt. Explicit sign-out clears both modes.
 *
 * Metadata refresh:
 * - Role and suspension are re-read ROLE_REFRESH_MS after the last success.
 *   This is request-driven, not a logout timer.
 * - A failed read of an existing session keeps the JWT and backs off.
 *   Fresh authorization checks still query the database and fail closed.
 */

export const ROLE_REFRESH_MS = 60_000;

/** First delay after a failed metadata refresh, then doubled up to the cap. */
export const AUTH_BACKOFF_BASE_MS = 5_000;
export const AUTH_BACKOFF_MAX_MS = 60_000;

/** Remember me checked: session and cookie lifetime from sign-in. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Remember me unchecked: session and cookie lifetime from sign-in. */
export const SESSION_SHORT_MAX_AGE_SECONDS = 24 * 60 * 60;

/** OAuth round-trip only. Not an authentication secret. */
export const REMEMBER_COOKIE = "notoria.remember";
export const REMEMBER_PREFERENCE_MAX_AGE_SECONDS = 15 * 60;

export const SESSION_COOKIE_BASES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

export const authClock = {
  now(): number {
    return Date.now();
  },
};

/**
 * Cookie / hard-cap lifetime for a session.
 * Missing remember (legacy tokens) keeps the long lifetime.
 */
export function sessionLifetimeSeconds(remember: boolean | undefined): number {
  return remember === false
    ? SESSION_SHORT_MAX_AGE_SECONDS
    : SESSION_MAX_AGE_SECONDS;
}

export function nextAuthBackoffMs(previous: number | undefined): number {
  if (!previous || previous < AUTH_BACKOFF_BASE_MS) return AUTH_BACKOFF_BASE_MS;
  return Math.min(AUTH_BACKOFF_MAX_MS, previous * 2);
}

/**
 * Category only. Callers must not log the raw error: driver messages can
 * contain host details.
 */
export function classifyDependencyError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  const text = `${name} ${message}`;
  if (/timeout|timed out|etimedout|connect_timeout|57014/i.test(text)) {
    return "timeout";
  }
  if (
    /econnrefused|econnreset|enotfound|eai_again|epipe|connection terminated|connection closed|too many clients|remaining connection|53300|sorry, too many clients|connection slots|cannot connect|connect etimedout/i.test(
      text,
    )
  ) {
    return "connection";
  }
  if (
    /syntax error|relation ["']?.+["']? does not exist|column ["']?.+["']? does not exist/i.test(
      text,
    )
  ) {
    return "query";
  }
  return "unavailable";
}

export function isTransientDependencyCategory(category: string): boolean {
  return (
    category === "timeout" ||
    category === "connection" ||
    category === "query" ||
    category === "unavailable"
  );
}

export function parseRememberValue(value: unknown): boolean | undefined {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

export function readRememberCookie(
  cookieHeader: string | null | undefined,
): boolean | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${REMEMBER_COOKIE}=`)) continue;
    return parseRememberValue(trimmed.slice(REMEMBER_COOKIE.length + 1));
  }
  return undefined;
}

/**
 * Keep sign-in return paths on this origin. Includes the query string.
 * Rejects protocol-relative and absolute URLs.
 */
export function safeLocalCallback(value: string | null | undefined): string {
  if (!value) return "/";
  const trimmed = value.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    return "/";
  }
  try {
    const url = new URL(trimmed, "https://notoria.local");
    if (url.origin !== "https://notoria.local") return "/";
    if (url.username || url.password) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function correlationIdFrom(request: Request): string {
  const incoming =
    request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id");
  if (incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming)) return incoming;
  return crypto.randomUUID();
}
