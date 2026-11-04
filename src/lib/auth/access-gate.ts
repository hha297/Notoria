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

/** Authenticated product home (not the public marketing root). */
export const APP_HOME_PATH = "/dashboard";

/** Public marketing root — logged-in visitors are redirected to APP_HOME_PATH. */
export function isPublicRootPath(pathname: string): boolean {
  return pathname === "/";
}

/**
 * Guest-only auth surfaces: logged-in users are redirected to the app home.
 * Forgot/reset stay guest-only so authenticated users are not stuck in recovery UI.
 */
export function isGuestOnlyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

/** Marketing / legal pages — open to everyone, including authenticated users. */
export function isPublicInfoPath(pathname: string): boolean {
  const isLegalRoute =
    pathname.startsWith("/privacy") || pathname.startsWith("/terms");
  const isSiteInfoRoute =
    pathname.startsWith("/about") ||
    pathname.startsWith("/our-story") ||
    pathname.startsWith("/how-to-use") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/help");
  return isLegalRoute || isSiteInfoRoute;
}

function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stream/webhook")
  );
}

/**
 * Paths that do not require authentication.
 * Includes `/` (landing), guest-only auth pages, public info/legal, and public APIs.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    isPublicRootPath(pathname) ||
    isGuestOnlyPath(pathname) ||
    isPublicInfoPath(pathname) ||
    isPublicApiPath(pathname)
  );
}

function isApi(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function appHomeUrl(origin: string): string {
  return new URL(APP_HOME_PATH, origin).toString();
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

  if (isLoggedIn && suspended && !isGuestOnlyPath(pathname) && !isPublicInfoPath(pathname) && !isPublicRootPath(pathname) && !isPublicApiPath(pathname)) {
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

  // Authenticated users leave guest-only auth pages for the app home.
  if (isLoggedIn && isGuestOnlyPath(pathname) && !suspended) {
    return { type: "redirect", url: appHomeUrl(origin) };
  }

  // Authenticated users opening the marketing root go straight into the app.
  if (isLoggedIn && isPublicRootPath(pathname) && !suspended) {
    return { type: "redirect", url: appHomeUrl(origin) };
  }

  if (isAdminRoute(pathname) && isLoggedIn && !authzStale && role !== "ADMIN") {
    return { type: "redirect", url: appHomeUrl(origin) };
  }

  return { type: "next" };
}
