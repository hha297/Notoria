import { cache } from "react";
import { NextResponse } from "next/server";
import type { User } from "@/db/schema";
import { getQuotaStatuses } from "@/lib/billing/entitlements";
import {
  displayPlan,
  entitlementPlan,
  isIntroOfferEligible,
} from "@/lib/billing/plans";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getSession } from "@/lib/auth/session";
import { hasActivePaidPlan, hasProAccess } from "@/lib/auth/paid-access";
import {
  getStripePremiumFirstMonthCouponId,
  getStripeProFirstMonthCouponId,
} from "@/lib/stripe/config";
import type { BillingState } from "@/lib/stripe/types";

function introCouponsConfigured() {
  return Boolean(
    getStripeProFirstMonthCouponId() && getStripePremiumFirstMonthCouponId(),
  );
}

export type SubscriptionSnapshot = Pick<
  User,
  | "id"
  | "subscriptionPlan"
  | "subscriptionStatus"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
  | "stripeCurrentPeriodEnd"
  | "stripeCancelAtPeriodEnd"
  | "scheduledSubscriptionPlan"
  | "stripeScheduleId"
  | "introOfferUsedAt"
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

export function hasActivePremiumSubscription(
  user: Pick<User, "role" | "subscriptionPlan" | "subscriptionStatus"> | null | undefined,
) {
  return hasProAccess(user) && displayPlan(user) === "premium";
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

export async function toBillingState(
  user: Pick<
    User,
    | "id"
    | "role"
    | "subscriptionPlan"
    | "subscriptionStatus"
    | "stripeCustomerId"
    | "stripeCurrentPeriodEnd"
    | "stripeCancelAtPeriodEnd"
    | "scheduledSubscriptionPlan"
    | "introOfferUsedAt"
  >,
): Promise<BillingState> {
  const plan = displayPlan(user);
  const quotas = await getQuotaStatuses(user.id, entitlementPlan(user));
  const scheduled =
    plan !== "free" &&
    user.scheduledSubscriptionPlan &&
    user.scheduledSubscriptionPlan !== "free" &&
    user.scheduledSubscriptionPlan !== plan
      ? user.scheduledSubscriptionPlan
      : null;
  return {
    isPro: plan === "pro" || plan === "premium",
    isPremium: plan === "premium",
    plan,
    status: user.subscriptionStatus,
    currentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: plan !== "free" && user.stripeCancelAtPeriodEnd && !scheduled,
    scheduledPlan: scheduled,
    hasStripeCustomer: Boolean(user.stripeCustomerId),
    introOfferEligible:
      isIntroOfferEligible(user) && introCouponsConfigured(),
    quotas,
  };
}
