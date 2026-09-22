import { auth } from "@/auth";
import { logPerf } from "@/lib/perf/dev-timing";

export default auth((request) => {
  const started = performance.now();
  const isLoggedIn = !!request.auth;
  const { pathname } = request.nextUrl;

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
  const isPublicRoute =
    isAuthRoute ||
    isPasswordResetRoute ||
    isLegalRoute ||
    isSiteInfoRoute ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/stream/webhook");

  try {
    if (!isLoggedIn && !isPublicRoute) {
      const loginUrl = new URL("/sign-in", request.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return Response.redirect(loginUrl);
    }

    if (isLoggedIn && isAuthRoute) {
      return Response.redirect(new URL("/", request.nextUrl.origin));
    }
  } finally {
    logPerf("middleware", performance.now() - started);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
