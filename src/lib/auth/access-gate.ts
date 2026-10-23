import { safeLocalCallback } from "@/lib/auth/policy";

export type AccessGateInput = {
  pathname: string;
  search: string;
  origin: string;
  isLoggedIn: boolean;
  role?: string | null;
  suspended: boolean;
  authzStale: boolean;
};

export type AccessGateDecision =
  | { type: "next" }
  | { type: "redirect"; url: string }
  | {
      type: "json";
      status: 401 | 403 | 503;
      body: { ok: false; code: string; error: string };
    };

function isPublicPath(pathname: string): boolean {
  const isAuthRoute =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isPasswordResetRoute =
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isLegalRoute =
    pathname.startsWith("/privacy") || pathname.startsWith("/terms");
  const isSiteInfoRoute =
    pathname.startsWith("/about") ||
    pathname.startsWith("/our-story") ||
    pathname.startsWith("/how-to-use") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/help");
  return (
    isAuthRoute ||
    isPasswordResetRoute ||
    isLegalRoute ||
    isSiteInfoRoute ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stream/webhook")
  );
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * First gate for navigation and APIs.
 * Suspension and admin denial here use claims already on the session.
 * Stale admin claims are not treated as permission: the admin layout calls
 * requireAdmin(), which reads the database. A metadata-refresh failure does
 * not by itself look like a signed-out user.
 */
export function decideAccess(input: AccessGateInput): AccessGateDecision {
  const { pathname, search, origin, isLoggedIn, role, suspended, authzStale } =
    input;
  const isPublic = isPublicPath(pathname);

  if (!isLoggedIn && !isPublic) {
    if (isApi(pathname)) {
      return {
        type: "json",
        status: 401,
        body: {
          ok: false,
          code: "UNAUTHORIZED",
          error: "Authentication required",
        },
      };
    }
    const loginUrl = new URL("/sign-in", origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      safeLocalCallback(`${pathname}${search}`),
    );
    return { type: "redirect", url: loginUrl.toString() };
  }

  if (isLoggedIn && suspended && !isAuthRoute(pathname) && !isPublic) {
    if (isApi(pathname)) {
      return {
        type: "json",
        status: 403,
        body: {
          ok: false,
          code: "ACCOUNT_SUSPENDED",
          error: "Account suspended",
        },
      };
    }
    const loginUrl = new URL("/sign-in", origin);
    loginUrl.searchParams.set("error", "AccountSuspended");
    return { type: "redirect", url: loginUrl.toString() };
  }

  if (isLoggedIn && isAuthRoute(pathname) && !suspended) {
    return { type: "redirect", url: new URL("/", origin).toString() };
  }

  if (isAdminRoute(pathname) && isLoggedIn && !authzStale && role !== "ADMIN") {
    return { type: "redirect", url: new URL("/", origin).toString() };
  }

  return { type: "next" };
}
