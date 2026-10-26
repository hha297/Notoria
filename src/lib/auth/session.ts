import { cache } from "react";
import { auth } from "@/auth";
import { AccountSuspendedError } from "@/lib/auth/errors";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { withTiming } from "@/lib/perf/dev-timing";

export const getSession = cache(async () =>
  withTiming("auth.session", () => auth()),
);

/**
 * Authenticated, non-suspended user id from a fresh database row.
 * Suspension and identity are enforced here so JWT claims alone are not
 * enough for protected mutations. Database failures throw
 * AuthorizationUnavailableError (503) and must not clear the session.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await getCurrentUserRecord();
  if (!user || user.id !== session.user.id) {
    throw new Error("Unauthorized");
  }
  if (user.suspendedAt) {
    throw new AccountSuspendedError();
  }

  return user.id;
});

/**
 * Soft presence check for pages. Database failures propagate as
 * AuthorizationUnavailableError — callers must not treat that as signed-out.
 */
export async function requireUser() {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  const user = await getCurrentUserRecord();
  if (!user || user.suspendedAt) {
    return null;
  }

  return session.user;
}
