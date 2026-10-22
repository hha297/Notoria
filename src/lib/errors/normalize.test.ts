import { describe, expect, it } from "vitest";
import { normalizeError, toErrorViewModel } from "@/lib/errors";

describe("normalizeError", () => {
  it("maps 401 and Unauthorized to unauthorized", () => {
    expect(normalizeError({ status: 401 }).kind).toBe("unauthorized");
    expect(normalizeError(new Error("Unauthorized")).kind).toBe("unauthorized");
  });

  it("maps 403 and AI_FORBIDDEN to forbidden", () => {
    expect(normalizeError({ status: 403 }).kind).toBe("forbidden");
    expect(normalizeError(new Error("AI_FORBIDDEN")).kind).toBe("forbidden");
  });

  it("keeps workspace and auth-service failures off the sign-in path", () => {
    expect(
      normalizeError({ status: 401, code: "WORKSPACE_REQUIRED" }).kind,
    ).toBe("forbidden");
    expect(normalizeError(new Error("NO_WORKSPACE")).kind).toBe("forbidden");
    expect(normalizeError({ status: 503, code: "AUTH_UNAVAILABLE" }).kind).toBe(
      "server",
    );
    expect(normalizeError(new Error("AUTH_UNAVAILABLE")).statusCode).toBe(503);
    expect(normalizeError({ status: 401 }).kind).toBe("unauthorized");
  });

  it("offers retry for service failures and sign-in for real 401s", () => {
    expect(toErrorViewModel(new Error("AUTH_UNAVAILABLE")).primaryAction.reload).toBe(
      true,
    );
    expect(
      toErrorViewModel({ status: 401, code: "UNAUTHORIZED" }).primaryAction.href,
    ).toContain("/sign-in");
    expect(
      toErrorViewModel({ status: 403, code: "WORKSPACE_REQUIRED" }).primaryAction
        .href,
    ).not.toContain("/sign-in");
  });

  it("maps resource not-found codes with resource context", () => {
    const error = normalizeError(new Error("PASSAGE_NOT_FOUND"), {
      resource: "reading",
    });
    expect(error.kind).toBe("resourceNotFound");
    expect(error.resource).toBe("reading");
  });

  it("maps rate limits including retryAfter", () => {
    const error = normalizeError({ status: 429, retryAfter: 90 });
    expect(error.kind).toBe("rateLimit");
    expect(error.retryAfterSeconds).toBe(90);
  });

  it("maps network TypeErrors", () => {
    expect(normalizeError(new TypeError("Failed to fetch")).kind).toBe(
      "network",
    );
  });
});

describe("toErrorViewModel", () => {
  it("builds resource-specific actions", () => {
    const model = toErrorViewModel(new Error("SET_NOT_FOUND"), {
      resource: "exercise",
    });
    expect(model.statusCode).toBe(404);
    expect(model.primaryAction.href).toBe("/exercises");
    expect(model.titleKey).toContain("exercise");
  });

  it("preserves sign-in callback for unauthorized", () => {
    const model = toErrorViewModel({ status: 401 }, {
      signInCallbackUrl: "/account",
    });
    expect(model.primaryAction.href).toContain("callbackUrl=%2Faccount");
  });
});
