import { NextResponse } from "next/server";
import { AccountSuspendedError, AuthorizationUnavailableError } from "@/lib/auth/errors";
import { classifyDependencyError } from "@/lib/auth/policy";

export type AuthJsonError = {
  status: 401 | 403 | 503;
  body: { ok: false; code: string; error: string };
};

export function jsonAuthError(error: unknown): AuthJsonError | null {
  if (error instanceof AuthorizationUnavailableError) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        error: "Authentication service temporarily unavailable",
      },
    };
  }
  if (error instanceof AccountSuspendedError) {
    return {
      status: 403,
      body: {
        ok: false,
        code: "ACCOUNT_SUSPENDED",
        error: "Account suspended",
      },
    };
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return {
      status: 401,
      body: {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Authentication required",
      },
    };
  }
  const category = classifyDependencyError(error);
  if (category === "timeout" || category === "connection") {
    return {
      status: 503,
      body: {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        error: "Authentication service temporarily unavailable",
      },
    };
  }
  return null;
}

export function authErrorResponse(error: unknown): NextResponse | null {
  const mapped = jsonAuthError(error);
  if (!mapped) return null;
  return NextResponse.json(mapped.body, {
    status: mapped.status,
    headers: { "cache-control": "no-store" },
  });
}
