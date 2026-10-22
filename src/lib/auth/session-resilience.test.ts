import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { decode, encode } from "@auth/core/jwt";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccessError, assertAdminUser } from "@/lib/auth/require-admin";
import { AccountSuspendedError } from "@/lib/auth/errors";
import { authClock } from "@/lib/auth/policy";
import {
  isClearedSetCookie,
  isSessionTokenSetCookie,
} from "@/lib/auth/session-cookie";

const SECRET = "test-secret-test-secret-test-secret-32b";

const findFirst = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  mode: "ok" as "ok" | "throw" | "missing",
  role: "USER" as "USER" | "ADMIN",
  suspendedAt: null as Date | null,
  now: Date.parse("2026-01-01T00:00:00.000Z"),
}));

vi.hoisted(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-32b";
  process.env.NEXTAUTH_SECRET = "test-secret-test-secret-test-secret-32b";
  process.env.DATABASE_URL = "postgres://notoria:notoria@127.0.0.1:5432/notoria";
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
});

vi.mock("bcryptjs", () => ({
  compare: async (password: string, hash: string) => hash === `hash:${password}`,
}));

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: () => ({}),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      users: {
        findFirst,
      },
    },
  },
}));

import { GET, POST } from "@/app/api/auth/[...nextauth]/route";
import middleware from "@/middleware";

const nextAuthRequire = createRequire(require.resolve("next-auth"));
const nextAuthPkg = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(require.resolve("next-auth")), "package.json"),
    "utf8",
  ),
) as { version: string };
const authCorePkg = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(nextAuthRequire.resolve("@auth/core")), "package.json"),
    "utf8",
  ),
) as { version: string };

function fixture() {
  return {
    id: "user-1",
    name: "Ada",
    email: "ada@notoria.test",
    image: null,
    role: state.role,
    suspendedAt: state.suspendedAt,
    passwordHash: "hash:password1",
    emailVerified: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function sessionHeaders(response: Response) {
  return response.headers.getSetCookie().filter(isSessionTokenSetCookie);
}

function liveSessionHeaders(response: Response) {
  return sessionHeaders(response).filter((header) => !isClearedSetCookie(header));
}

function assertSessionNotCleared(response: Response) {
  const cleared = sessionHeaders(response).filter(isClearedSetCookie);
  const live = liveSessionHeaders(response);
  expect(cleared.length === 0 || live.length > 0).toBe(true);
}

function cookiePair(header: string) {
  return header.split(";")[0] ?? "";
}

function pageRequest(path: string, cookie?: string) {
  const headers = new Headers({
    host: "localhost",
    "x-forwarded-proto": "http",
  });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(`http://localhost${path}`, { headers });
}

function persistence(header: string): "session" | "persistent" | "cleared" {
  if (isClearedSetCookie(header)) return "cleared";
  if (/expires=/i.test(header) || /max-age=[1-9]/i.test(header)) {
    return "persistent";
  }
  return "session";
}

async function readSessionToken(header: string) {
  const pair = cookiePair(header);
  const eq = pair.indexOf("=");
  const name = pair.slice(0, eq);
  const value = decodeURIComponent(pair.slice(eq + 1));
  const salt = name.replace(/\.\d+$/, "");
  return decode({ token: value, secret: SECRET, salt });
}

async function authRequest(
  path: string,
  init?: { method?: string; cookie?: string; body?: string },
) {
  const headers = new Headers();
  if (init?.cookie) headers.set("cookie", init.cookie);
  if (init?.body) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  const request = new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body,
  });
  return (init?.method ?? "GET") === "POST" ? POST(request) : GET(request);
}

async function csrfCookie() {
  const response = await authRequest("/api/auth/csrf");
  const body = (await response.json()) as { csrfToken: string };
  const cookie = response.headers
    .getSetCookie()
    .map(cookiePair)
    .filter(Boolean)
    .join("; ");
  return { csrfToken: body.csrfToken, cookie };
}

async function signIn(options?: {
  remember?: "true" | "false";
  cookie?: string;
  omitRemember?: boolean;
}) {
  const csrf = await csrfCookie();
  const params = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: "ada@notoria.test",
    password: "password1",
    callbackUrl: "http://localhost/vocabulary?tab=due",
  });
  if (!options?.omitRemember) {
    params.set("remember", options?.remember ?? "false");
  }
  const cookie = [csrf.cookie, options?.cookie].filter(Boolean).join("; ");
  return authRequest("/api/auth/callback/credentials", {
    method: "POST",
    cookie,
    body: params.toString(),
  });
}

async function sessionRequest(cookie: string) {
  return authRequest("/api/auth/session", { cookie });
}

function liveCookieHeader(response: Response) {
  const live = liveSessionHeaders(response);
  expect(live.length).toBeGreaterThan(0);
  return live.map(cookiePair).join("; ");
}

beforeEach(() => {
  state.mode = "ok";
  state.role = "USER";
  state.suspendedAt = null;
  state.now = Date.parse("2026-01-01T00:00:00.000Z");
  vi.spyOn(authClock, "now").mockImplementation(() => state.now);
  findFirst.mockImplementation(async () => {
    if (state.mode === "throw") {
      throw new Error("remaining connection slots are reserved");
    }
    if (state.mode === "missing") return undefined;
    return fixture();
  });
});

describe("locked Auth.js versions", () => {
  it("uses the versions resolved for next-auth", () => {
    expect(nextAuthPkg.version).toBe("5.0.0-beta.31");
    expect(authCorePkg.version).toBe("0.41.2");
  });
});

describe("session resilience", () => {
  it("keeps a valid session when metadata refresh fails, then works again", async () => {
    const signedIn = await signIn({ remember: "true" });
    assertSessionNotCleared(signedIn);
    const cookie = liveCookieHeader(signedIn);
    expect(persistence(liveSessionHeaders(signedIn)[0]!)).toBe("persistent");

    state.now += 61_000;
    state.mode = "throw";
    const callsBefore = findFirst.mock.calls.length;
    const failed = await sessionRequest(cookie);
    expect(findFirst.mock.calls.length).toBeGreaterThan(callsBefore);
    assertSessionNotCleared(failed);
    const failedBody = (await failed.json()) as { user?: { id?: string; authzStale?: boolean } };
    expect(failedBody.user?.id).toBe("user-1");
    expect(failedBody.user?.authzStale).toBe(true);
    const failedCookie = liveCookieHeader(failed);
    const failedToken = await readSessionToken(liveSessionHeaders(failed)[0]!);
    expect(failedToken?.authzRetryAt).toBeGreaterThan(state.now);

    const callsDuringBackoff = findFirst.mock.calls.length;
    state.now += 1_000;
    const backedOff = await sessionRequest(failedCookie);
    expect(findFirst.mock.calls.length).toBe(callsDuringBackoff);
    assertSessionNotCleared(backedOff);
    expect(((await backedOff.json()) as { user?: { id?: string } }).user?.id).toBe(
      "user-1",
    );

    state.mode = "ok";
    state.role = "ADMIN";
    state.now += 60_000;
    const recovered = await sessionRequest(liveCookieHeader(backedOff));
    const recoveredBody = (await recovered.json()) as {
      user?: { role?: string; authzStale?: boolean };
    };
    expect(recoveredBody.user?.role).toBe("ADMIN");
    expect(recoveredBody.user?.authzStale).toBe(false);
    assertSessionNotCleared(recovered);
  });

  it("does not redirect middleware navigation to sign-in on a transient refresh failure", async () => {
    const signedIn = await signIn({ remember: "false" });
    const cookie = liveCookieHeader(signedIn);
    state.now += 61_000;
    state.mode = "throw";

    const response = await middleware(
      pageRequest("/vocabulary?folder=abc", cookie),
      {} as never,
    );
    expect(response?.status).not.toBe(307);
    expect(response?.headers.get("location") ?? "").not.toContain("/sign-in");
    assertSessionNotCleared(response!);
    expect(persistence(liveSessionHeaders(response!)[0]!)).toBe("persistent");
  });

  it("does not let one failed refresh delete a session another request kept", async () => {
    const signedIn = await signIn({ remember: "true" });
    const cookie = liveCookieHeader(signedIn);
    state.now += 61_000;
    let failed = false;
    findFirst.mockImplementation(async () => {
      if (!failed) {
        failed = true;
        throw new Error("connect ETIMEDOUT");
      }
      return fixture();
    });

    const [first, second] = await Promise.all([
      sessionRequest(cookie),
      sessionRequest(cookie),
    ]);
    assertSessionNotCleared(first);
    assertSessionNotCleared(second);
    expect(liveSessionHeaders(first).length).toBeGreaterThan(0);
    expect(liveSessionHeaders(second).length).toBeGreaterThan(0);
    const bodies = await Promise.all([first.json(), second.json()]);
    expect(bodies.every((body) => body?.user?.id === "user-1")).toBe(true);
  });

  it("fails a new sign-in when dependencies are down and keeps an existing cookie", async () => {
    const signedIn = await signIn({ remember: "false" });
    const cookie = liveCookieHeader(signedIn);
    state.mode = "throw";
    const again = await signIn({ remember: "true", cookie });
    assertSessionNotCleared(again);
    expect(again.headers.get("location") ?? "").not.toContain("authjs.session-token=");

    state.mode = "ok";
    const session = await sessionRequest(cookie);
    expect(((await session.json()) as { user?: { id?: string } }).user?.id).toBe(
      "user-1",
    );
  });

  it("clears a confirmed deleted user and rejects invalid or expired tokens", async () => {
    const signedIn = await signIn({ remember: "true" });
    const cookie = liveCookieHeader(signedIn);
    state.now += 61_000;
    state.mode = "missing";
    const missing = await sessionRequest(cookie);
    expect(await missing.json()).toBeNull();
    expect(sessionHeaders(missing).some(isClearedSetCookie)).toBe(true);

    const invalid = await sessionRequest("authjs.session-token=not-a-jwt");
    expect(await invalid.json()).toBeNull();
    expect(sessionHeaders(invalid).some(isClearedSetCookie)).toBe(true);

    const expired = await encode({
      token: { id: "user-1", sub: "user-1", role: "USER", remember: true },
      secret: SECRET,
      salt: "authjs.session-token",
      maxAge: -60,
    });
    const expiredResponse = await sessionRequest(
      `authjs.session-token=${expired}`,
    );
    expect(await expiredResponse.json()).toBeNull();
    expect(sessionHeaders(expiredResponse).some(isClearedSetCookie)).toBe(true);

    const anonymous = await middleware(
      pageRequest("/vocabulary?folder=abc"),
      {} as never,
    );
    const location = anonymous?.headers.get("location") ?? "";
    expect(location).toContain("/sign-in");
    expect(new URL(location).searchParams.get("callbackUrl")).toBe(
      "/vocabulary?folder=abc",
    );

    const api = await middleware(
      pageRequest("/api/reading/documents/1"),
      {} as never,
    );
    expect(api?.status).toBe(401);
    expect(api?.headers.get("content-type")).toContain("application/json");
    expect(await api?.json()).toMatchObject({ code: "UNAUTHORIZED" });

    const webhook = await middleware(
      pageRequest("/api/stripe/webhook"),
      {} as never,
    );
    expect(webhook?.headers.get("location")).toBeNull();
    expect(webhook?.status).not.toBe(401);
  });

  it("denies suspended users and applies admin demotion from the database", async () => {
    state.role = "ADMIN";
    const signedIn = await signIn({ remember: "true" });
    const cookie = liveCookieHeader(signedIn);
    state.now += 61_000;
    state.suspendedAt = new Date("2026-01-02T00:00:00.000Z");
    const suspended = await middleware(
      pageRequest("/vocabulary", cookie),
      {} as never,
    );
    expect(suspended?.headers.get("location")).toContain("error=AccountSuspended");
    assertSessionNotCleared(suspended!);

    const api = await middleware(
      pageRequest("/api/ai/coach-chat", liveCookieHeader(suspended!)),
      {} as never,
    );
    expect(api?.status).toBe(403);
    expect(await api?.json()).toMatchObject({ code: "ACCOUNT_SUSPENDED" });

    state.suspendedAt = null;
    state.role = "USER";
    state.now += 61_000;
    const demoted = await sessionRequest(liveCookieHeader(suspended!));
    const body = (await demoted.json()) as { user?: { role?: string } };
    expect(body.user?.role).toBe("USER");
    expect(() =>
      assertAdminUser({ id: "user-1", role: "USER", suspendedAt: null }),
    ).toThrow(AdminAccessError);
    expect(() =>
      assertAdminUser({
        id: "user-1",
        role: "ADMIN",
        suspendedAt: new Date(),
      }),
    ).toThrow(AccountSuspendedError);

    const admin = await middleware(
      pageRequest("/admin", liveCookieHeader(demoted)),
      {} as never,
    );
    const adminLocation = admin?.headers.get("location") ?? "";
    expect(new URL(adminLocation).pathname).toBe("/");
  });
});

describe("remember me cookies", () => {
  it("sets a 30-day cookie when checked and a 24-hour cookie when not", async () => {
    const remembered = await signIn({ remember: "true" });
    const rememberedHeader = liveSessionHeaders(remembered)[0]!;
    expect(persistence(rememberedHeader)).toBe("persistent");
    const rememberedToken = await readSessionToken(rememberedHeader);
    expect(rememberedToken?.remember).toBe(true);
    const rememberedExpires = rememberedHeader.match(/expires=([^;]+)/i)?.[1];
    expect(rememberedExpires).toBeTruthy();
    const rememberedExpiresAt = Date.parse(rememberedExpires!);
    expect(rememberedExpiresAt).toBeGreaterThan(
      Date.now() + 20 * 24 * 60 * 60 * 1000,
    );
    expect(rememberedExpiresAt).toBeLessThan(
      Date.now() + 31 * 24 * 60 * 60 * 1000,
    );

    const short = await signIn({ remember: "false" });
    const shortHeader = liveSessionHeaders(short)[0]!;
    expect(persistence(shortHeader)).toBe("persistent");
    expect(await readSessionToken(shortHeader)).toMatchObject({
      remember: false,
    });
    const shortExpires = shortHeader.match(/expires=([^;]+)/i)?.[1];
    expect(shortExpires).toBeTruthy();
    const shortExpiresAt = Date.parse(shortExpires!);
    expect(shortExpiresAt).toBeGreaterThan(Date.now() + 20 * 60 * 60 * 1000);
    expect(shortExpiresAt).toBeLessThan(Date.now() + 25 * 60 * 60 * 1000);
  });

  it("keeps the chosen persistence across refresh and can switch on the next sign-in", async () => {
    const short = await signIn({ remember: "false" });
    state.now += 61_000;
    const refreshed = await sessionRequest(liveCookieHeader(short));
    const refreshedHeader = liveSessionHeaders(refreshed)[0]!;
    expect(persistence(refreshedHeader)).toBe("persistent");
    expect(await readSessionToken(refreshedHeader)).toMatchObject({
      remember: false,
    });
    const refreshedExpires = refreshedHeader.match(/expires=([^;]+)/i)?.[1];
    expect(Date.parse(refreshedExpires!)).toBeLessThan(
      Date.now() + 25 * 60 * 60 * 1000,
    );

    const switched = await signIn({
      remember: "true",
      cookie: liveCookieHeader(refreshed),
    });
    expect(persistence(liveSessionHeaders(switched)[0]!)).toBe("persistent");
    expect(await readSessionToken(liveSessionHeaders(switched)[0]!)).toMatchObject({
      remember: true,
    });

    const csrf = await csrfCookie();
    const signedOut = await authRequest("/api/auth/signout", {
      method: "POST",
      cookie: `${csrf.cookie}; ${liveCookieHeader(switched)}`,
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        callbackUrl: "http://localhost/",
      }).toString(),
    });
    expect(sessionHeaders(signedOut).some(isClearedSetCookie)).toBe(true);
    expect(
      signedOut.headers.getSetCookie().some((header) => /notoria\.remember=/i.test(header) && isClearedSetCookie(header)),
    ).toBe(true);

    const after = await authRequest("/api/auth/session");
    expect(await after.json()).toBeNull();
  });

  it("reads Remember me from the OAuth preference cookie when credentials omit it", async () => {
    const csrf = await csrfCookie();
    const response = await authRequest("/api/auth/callback/credentials", {
      method: "POST",
      cookie: `${csrf.cookie}; notoria.remember=1`,
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: "ada@notoria.test",
        password: "password1",
        callbackUrl: "http://localhost/",
      }).toString(),
    });
    const header = liveSessionHeaders(response)[0]!;
    expect(persistence(header)).toBe("persistent");
    expect(await readSessionToken(header)).toMatchObject({ remember: true });
    expect(
      response.headers.getSetCookie().some((cookie) =>
        cookie.startsWith("notoria.remember="),
      ),
    ).toBe(true);
  });

  it("preserves both cookie modes when metadata refresh fails", async () => {
    for (const remember of ["true", "false"] as const) {
      state.now += 1_000;
      const signedIn = await signIn({ remember });
      const before = persistence(liveSessionHeaders(signedIn)[0]!);
      state.now += 61_000;
      state.mode = "throw";
      const failed = await sessionRequest(liveCookieHeader(signedIn));
      assertSessionNotCleared(failed);
      expect(persistence(liveSessionHeaders(failed)[0]!)).toBe(before);
      expect(((await failed.json()) as { user?: { id?: string } }).user?.id).toBe(
        "user-1",
      );
      state.mode = "ok";
    }
  });
});
