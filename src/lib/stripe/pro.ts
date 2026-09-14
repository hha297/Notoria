import { cache } from "react";
import { NextResponse } from "next/server";
import type { User } from "@/db/schema";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
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

export const getCurrentSubscription = cache(
  async (): Promise<SubscriptionSnapshot | null> => {
    return getCurrentUserRecord();
  },
);

export async function requireActiveProSubscription() {
  const user = await getCurrentUserRecord();

  if (!user || !hasActiveProSubscription(user)) {
    throw new ProRequiredError();
  }

  return user;
}

export async function requireProApiUser() {
  const session = await getSession();

  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const user = await getCurrentUserRecord();

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
