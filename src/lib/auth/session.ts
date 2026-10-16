import { cache } from "react";
import { auth } from "@/auth";
import { AccountSuspendedError } from "@/lib/auth/errors";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { withTiming } from "@/lib/perf/dev-timing";

export const getSession = cache(async () =>
  withTiming("auth.session", () => auth()),
);

/**
 * Authenticated, non-suspended user id. Suspension is enforced here so
 * existing sessions lose access on the next protected server call.
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
