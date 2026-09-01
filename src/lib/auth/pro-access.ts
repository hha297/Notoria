import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, getCurrentUserId } from "@/lib/auth/session";
import { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";

export { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";

export const getCurrentProAccess = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return { hasProAccess: false };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  return { hasProAccess: hasProAccess(user) };
});

export async function requireProAccess() {
  const userId = await getCurrentUserId();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  if (!hasProAccess(user)) {
    throw new ProAccessError();
  }

  return user;
}
