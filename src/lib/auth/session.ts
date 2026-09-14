import { cache } from "react";
import { auth } from "@/auth";
import { withTiming } from "@/lib/perf/dev-timing";

export const getSession = cache(async () =>
  withTiming("auth.session", () => auth()),
);

export const getCurrentUserId = cache(async (): Promise<string> => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
});

export async function requireUser() {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}
