import { decode } from "@auth/core/jwt";
import {
  REMEMBER_COOKIE,
  SESSION_COOKIE_BASES,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SHORT_MAX_AGE_SECONDS,
  sessionLifetimeSeconds,
} from "@/lib/auth/policy";

/**
 * Auth.js 0.41.2 always sets an Expires date from session.maxAge (the long
 * Remember me bound) when it rewrites the session cookie. Unchecked sessions
 * rewrite that to SESSION_SHORT_MAX_AGE_SECONDS so the browser drops the
 * cookie after 24 hours. Deletion cookies are left intact.
 */

type ParsedSetCookie = {
  name: string;
  value: string;
  attributes: string;
};

function parseSetCookie(header: string): ParsedSetCookie {
  const semi = header.indexOf(";");
  const first = semi === -1 ? header : header.slice(0, semi);
  const attributes = semi === -1 ? "" : header.slice(semi);
  const eq = first.indexOf("=");
  return {
    name: eq === -1 ? first.trim() : first.slice(0, eq).trim(),
    value: eq === -1 ? "" : first.slice(eq + 1),
    attributes,
  };
}

function sessionBaseName(name: string): string | null {
  for (const base of SESSION_COOKIE_BASES) {
    if (name === base || name.startsWith(`${base}.`)) return base;
  }
  return null;
}

export function isSessionTokenSetCookie(header: string): boolean {
  return sessionBaseName(parseSetCookie(header).name) !== null;
}

export function isClearedSetCookie(header: string): boolean {
  const parsed = parseSetCookie(header);
  if (parsed.value === "") return true;
  return /(?:^|;)\s*max-age=0(?:\s*;|$)/i.test(parsed.attributes);
}

function stripPersistence(attributes: string): string {
  return attributes
    .replace(/;\s*expires=[^;]*/gi, "")
    .replace(/;\s*max-age=[^;]*/gi, "");
}

function withMaxAge(attributes: string, maxAgeSeconds: number, now = Date.now()): string {
  const expires = new Date(now + maxAgeSeconds * 1000).toUTCString();
  return `${stripPersistence(attributes)}; Expires=${expires}; Max-Age=${maxAgeSeconds}`;
}

function serialize(parsed: ParsedSetCookie, attributes: string): string {
  return `${parsed.name}=${parsed.value}${attributes}`;
}

function chunkIndex(name: string, base: string): number {
  if (name === base) return 0;
  const suffix = name.slice(base.length + 1);
  const index = Number(suffix);
  return Number.isFinite(index) ? index : 0;
}

function authSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

async function cookieLifetimeSeconds(
  base: string,
  parts: ParsedSetCookie[],
): Promise<number | null> {
  const secret = authSecret();
  if (!secret) return null;
  const token = parts
    .slice()
    .sort((a, b) => chunkIndex(a.name, base) - chunkIndex(b.name, base))
    .map((part) => {
      try {
        return decodeURIComponent(part.value);
      } catch {
        return part.value;
      }
    })
    .join("");
  if (!token) return null;
  try {
    const payload = await decode({ token, secret, salt: base });
    if (!payload) return null;
    if (payload.remember === false) return SESSION_SHORT_MAX_AGE_SECONDS;
    if (payload.remember === true) return SESSION_MAX_AGE_SECONDS;
    return sessionLifetimeSeconds(undefined);
  } catch {
    return null;
  }
}

export async function rewriteSessionCookies(
  headers: string[],
): Promise<string[]> {
  const groups = new Map<string, number[]>();
  headers.forEach((header, index) => {
    const base = sessionBaseName(parseSetCookie(header).name);
    if (!base) return;
    const list = groups.get(base) ?? [];
    list.push(index);
    groups.set(base, list);
  });

  const next = headers.slice();
  for (const [base, indexes] of groups) {
    const parsed = indexes.map((index) => parseSetCookie(headers[index]!));
    if (parsed.some((cookie) => isClearedSetCookie(serialize(cookie, cookie.attributes)))) {
      continue;
    }
    const maxAge = await cookieLifetimeSeconds(base, parsed);
    if (maxAge == null || maxAge === SESSION_MAX_AGE_SECONDS) continue;
    indexes.forEach((index, offset) => {
      const cookie = parsed[offset]!;
      next[index] = serialize(cookie, withMaxAge(cookie.attributes, maxAge));
    });
  }
  return next;
}

export async function applySessionPersistence(
  response: Response,
): Promise<Response> {
  const original =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  if (!original.some(isSessionTokenSetCookie)) return response;
  const rewritten = await rewriteSessionCookies(original);
  if (rewritten.every((value, index) => value === original[index])) {
    return response;
  }
  return replaceSetCookies(response, rewritten);
}

export function stripSessionSetCookies(response: Response): Response {
  const original =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  if (!original.some(isSessionTokenSetCookie)) return response;
  return replaceSetCookies(
    response,
    original.filter((header) => !isSessionTokenSetCookie(header)),
  );
}

function replaceSetCookies(response: Response, cookies: string[]): Response {
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearRememberPreferenceHeader(secure: boolean): string {
  const parts = [
    `${REMEMBER_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function appendRememberPreferenceClear(
  response: Response,
  request: Request,
): Response {
  const secure = new URL(request.url).protocol === "https:";
  const headers = new Headers(response.headers);
  headers.append("set-cookie", clearRememberPreferenceHeader(secure));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isAuthCookieMutation(pathname: string): boolean {
  return (
    pathname.includes("/api/auth/callback") ||
    pathname.includes("/api/auth/signout") ||
    pathname.includes("/api/auth/signin")
  );
}

export function shouldClearRememberPreference(pathname: string): boolean {
  return (
    pathname.includes("/api/auth/callback") ||
    pathname.includes("/api/auth/signout")
  );
}

/** Long bound used by Auth.js session.maxAge (Remember me checked). */
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_MAX_AGE_SECONDS;
