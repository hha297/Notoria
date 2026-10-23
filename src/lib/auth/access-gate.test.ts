import { describe, expect, it } from "vitest";
import { mapAiClientCode } from "@/lib/ai/client-status";
import { decideAccess } from "@/lib/auth/access-gate";
import {
  AUTH_SESSION_REFETCH_INTERVAL,
  AUTH_SESSION_REFETCH_ON_WINDOW_FOCUS,
} from "@/lib/auth/client-session";
import { AuthorizationUnavailableError } from "@/lib/auth/errors";
import { jsonAuthError } from "@/lib/auth/http";
import {
  ROLE_REFRESH_MS,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SHORT_MAX_AGE_SECONDS,
  safeLocalCallback,
} from "@/lib/auth/policy";
import { requireOwnedRow } from "@/lib/data/owned";
import { hasProAccess } from "@/lib/auth/paid-access";

describe("safeLocalCallback", () => {
  it("keeps the path and query string", () => {
    expect(safeLocalCallback("/vocabulary?folder=abc&tab=due")).toBe(
      "/vocabulary?folder=abc&tab=due",
    );
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(safeLocalCallback("https://evil.example/steal")).toBe("/");
    expect(safeLocalCallback("//evil.example")).toBe("/");
    expect(safeLocalCallback("/\\evil.example")).toBe("/");
  });
});

describe("decideAccess", () => {
  const base = {
    origin: "https://www.notoria.fi",
    role: "USER",
    suspended: false,
    authzStale: false,
  };

  it("preserves the query string on page sign-in redirects", () => {
    const decision = decideAccess({
      ...base,
      pathname: "/vocabulary",
      search: "?folder=abc&tab=due",
      isLoggedIn: false,
    });
    expect(decision.type).toBe("redirect");
    if (decision.type !== "redirect") return;
    const url = new URL(decision.url);
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("callbackUrl")).toBe(
      "/vocabulary?folder=abc&tab=due",
    );
  });

  it("returns JSON for protected APIs and leaves webhooks public", () => {
    const api = decideAccess({
      ...base,
      pathname: "/api/reading/documents/1",
      search: "",
      isLoggedIn: false,
    });
    expect(api).toMatchObject({
      type: "json",
      status: 401,
      body: { code: "UNAUTHORIZED" },
    });

    expect(
      decideAccess({
        ...base,
        pathname: "/api/stripe/webhook",
        search: "",
        isLoggedIn: false,
      }).type,
    ).toBe("next");
    expect(
      decideAccess({
        ...base,
        pathname: "/api/stream/webhook",
        search: "",
        isLoggedIn: false,
      }).type,
    ).toBe("next");
    expect(
      decideAccess({
        ...base,
        pathname: "/api/auth/session",
        search: "",
        isLoggedIn: false,
      }).type,
    ).toBe("next");
  });

  it("denies suspended users without treating a stale session as signed out", () => {
    const page = decideAccess({
      ...base,
      pathname: "/vocabulary",
      search: "",
      isLoggedIn: true,
      suspended: true,
    });
    expect(page.type).toBe("redirect");
    if (page.type === "redirect") {
      expect(new URL(page.url).searchParams.get("error")).toBe(
        "AccountSuspended",
      );
    }

    expect(
      decideAccess({
        ...base,
        pathname: "/api/ai/coach-chat",
        search: "",
        isLoggedIn: true,
        suspended: true,
      }),
    ).toMatchObject({ type: "json", status: 403, body: { code: "ACCOUNT_SUSPENDED" } });

    expect(
      decideAccess({
        ...base,
        pathname: "/vocabulary",
        search: "",
        isLoggedIn: true,
        authzStale: true,
      }).type,
    ).toBe("next");
  });

  it("does not grant admin pages from a stale admin claim", () => {
    expect(
      decideAccess({
        ...base,
        pathname: "/admin",
        search: "",
        isLoggedIn: true,
        role: "USER",
      }).type,
    ).toBe("redirect");

    expect(
      decideAccess({
        ...base,
        pathname: "/admin",
        search: "",
        isLoggedIn: true,
        role: "TESTER",
      }).type,
    ).toBe("redirect");

    expect(
      decideAccess({
        ...base,
        pathname: "/admin",
        search: "",
        isLoggedIn: true,
        role: "ADMIN",
        authzStale: true,
      }).type,
    ).toBe("next");
  });
});

describe("authorization errors", () => {
  it("maps a failed fresh check to 503 and a missing session to 401", () => {
    expect(jsonAuthError(new AuthorizationUnavailableError("timeout"))).toMatchObject({
      status: 503,
      body: { code: "AUTH_UNAVAILABLE" },
    });
    expect(jsonAuthError(new Error("Unauthorized"))).toMatchObject({
      status: 401,
      body: { code: "UNAUTHORIZED" },
    });
    expect(jsonAuthError(new Error("remaining connection slots are reserved"))).toMatchObject({
      status: 503,
    });
  });

  it("does not treat a stale admin flag as paid access when no user row is available", () => {
    expect(hasProAccess(null)).toBe(false);
    expect(ROLE_REFRESH_MS).toBe(60_000);
    expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(SESSION_SHORT_MAX_AGE_SECONDS).toBe(24 * 60 * 60);
  });
});

describe("ownership", () => {
  it("denies a row owned by someone else", async () => {
    await expect(
      requireOwnedRow(
        { userId: "other", workspaceId: "ws", id: "1" },
        "user-1",
        "ws",
      ),
    ).rejects.toThrow("Not found");
  });
});

describe("AI client status", () => {
  it("does not turn workspace or service failures into an auth code", () => {
    expect(mapAiClientCode(401, "WORKSPACE_REQUIRED")).toBe("AI_UNAVAILABLE");
    expect(mapAiClientCode(503, "AUTH_UNAVAILABLE")).toBe("AI_UNAVAILABLE");
    expect(mapAiClientCode(401, "UNAUTHORIZED")).toBe("AI_FORBIDDEN");
    expect(mapAiClientCode(403, "AI_FORBIDDEN")).toBe("AI_FORBIDDEN");
  });
});

describe("client session polling", () => {
  it("does not poll every 60 seconds and does refresh when the tab is focused", () => {
    expect(AUTH_SESSION_REFETCH_INTERVAL).toBe(0);
    expect(AUTH_SESSION_REFETCH_ON_WINDOW_FOCUS).toBe(true);
  });
});
