import { auth } from "@/auth";
import { decideAccess } from "@/lib/auth/access-gate";
import { logPerf } from "@/lib/perf/dev-timing";
import { runWithAuthRequest } from "@/lib/auth/request-context";
import {
  applySessionPersistence,
  isAuthCookieMutation,
  stripSessionSetCookies,
} from "@/lib/auth/session-cookie";

const withAuth = auth((request) => {
  const started = performance.now();
  try {
    const decision = decideAccess({
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      origin: request.nextUrl.origin,
      isLoggedIn: Boolean(request.auth?.user?.id),
      role: request.auth?.user?.role,
      suspended: Boolean(request.auth?.user?.suspendedAt),
      authzStale: Boolean(request.auth?.user?.authzStale),
    });

    if (decision.type === "redirect") {
      return Response.redirect(decision.url);
    }
    if (decision.type === "json") {
      return Response.json(decision.body, {
        status: decision.status,
        headers: { "cache-control": "no-store" },
      });
    }
  } finally {
    logPerf("middleware", performance.now() - started);
  }
});

export default async function middleware(
  request: Parameters<typeof withAuth>[0],
  event: Parameters<typeof withAuth>[1],
) {
  return runWithAuthRequest(request, async () => {
    const response = await withAuth(request, event);
    if (!response) return response;
    if (isAuthCookieMutation(request.nextUrl.pathname)) {
      return stripSessionSetCookies(response);
    }
    return applySessionPersistence(response);
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
