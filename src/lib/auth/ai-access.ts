import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { auth } from "@/auth";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasActiveProSubscription } from "@/lib/stripe/pro";

export class AiAccessError extends Error {
  constructor() {
    super("AI_FORBIDDEN");
    this.name = "AiAccessError";
  }
}

export function hasAiAccess(
  user:
    | (Pick<User, "role"> &
        Pick<User, "subscriptionPlan" | "subscriptionStatus">)
    | null
    | undefined,
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return hasActiveProSubscription(user);
}

export async function getCurrentAiAccess() {
  const session = await auth();
  if (!session?.user?.id) {
    return { canUseAi: false };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });

  return { canUseAi: hasAiAccess(user) };
}

export async function requireAiAccess() {
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

  if (!hasAiAccess(user)) {
    throw new AiAccessError();
  }

  return user;
}
