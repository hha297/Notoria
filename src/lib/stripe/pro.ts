import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { auth } from "@/auth";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasActivePaidPlan } from "@/lib/auth/paid-access";
import type { BillingState } from "@/lib/stripe/types";

export type SubscriptionSnapshot = Pick<
  User,
  | "id"
  | "subscriptionPlan"
  | "subscriptionStatus"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
  | "stripeCurrentPeriodEnd"
>;

export class ProRequiredError extends Error {
  constructor() {
    super("PRO_REQUIRED");
    this.name = "ProRequiredError";
  }
}

export function hasActiveProSubscription(
  user: Pick<User, "subscriptionPlan" | "subscriptionStatus"> | null | undefined,
) {
  return hasActivePaidPlan(user);
}

export async function getCurrentSubscription(): Promise<SubscriptionSnapshot | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  return user ?? null;
}

export async function requireActiveProSubscription() {
  const userId = await getCurrentUserId();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!hasActiveProSubscription(user)) {
    throw new ProRequiredError();
  }

  return user;
}

export async function requireProApiUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  if (!hasActiveProSubscription(user)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Pro subscription required", code: "PRO_REQUIRED" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, user };
}

export function toBillingState(
  user: Pick<
    User,
    | "subscriptionPlan"
    | "subscriptionStatus"
    | "stripeCustomerId"
    | "stripeCurrentPeriodEnd"
  >,
): BillingState {
  return {
    isPro: hasActiveProSubscription(user),
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() ?? null,
    hasStripeCustomer: Boolean(user.stripeCustomerId),
  };
}
