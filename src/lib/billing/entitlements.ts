import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import {
  PremiumRequiredError,
  ProRequiredError,
  QuotaExceededError,
} from "@/lib/billing/errors";
import {
  CAPABILITY_FEATURES,
  QUOTA_FEATURES,
  displayPlan,
  entitlementPlan,
  featureEnabled,
  getFeatureAccess,
  quotaResetAt,
  usageDateUtc,
  type FeatureId,
  type PlanId,
  type QuotaFeatureId,
  type QuotaStatus,
} from "@/lib/billing/plans";
import {
  finalizeUsageReservation,
  readUsageCounts,
  refundUsageReservation,
  reserveUsage,
} from "@/lib/billing/usage";

export type { QuotaStatus };

export type UserEntitlements = {
  userId: string;
  plan: PlanId;
  displayPlan: PlanId;
  quotas: QuotaStatus[];
  features: Record<FeatureId, boolean>;
};

type EntitlementUser = Pick<
  User,
  "id" | "role" | "subscriptionPlan" | "subscriptionStatus"
>;

export async function getQuotaStatuses(
  userId: string,
  plan: PlanId,
  now = new Date(),
): Promise<QuotaStatus[]> {
  const resetAt = quotaResetAt(now);
  const needsCounts = QUOTA_FEATURES.some((feature) => {
    const access = getFeatureAccess(plan, feature);
    return access.kind === "quota" && access.limit !== null;
  });
  const counts = needsCounts
    ? await readUsageCounts(userId, usageDateUtc(now))
    : new Map<string, number>();

  return QUOTA_FEATURES.map((feature) => {
    const access = getFeatureAccess(plan, feature);
    const limit = access.kind === "quota" ? access.limit : null;
    const used = limit === null ? 0 : (counts.get(feature) ?? 0);
    return {
      feature,
      limit,
      used,
      remaining: limit === null ? null : Math.max(0, limit - used),
      resetAt,
    };
  });
}

export function entitlementsFromUser(
  user: EntitlementUser,
  quotas: QuotaStatus[],
): UserEntitlements {
  const plan = entitlementPlan(user);
  const features = {} as Record<FeatureId, boolean>;
  for (const feature of QUOTA_FEATURES) {
    const quota = quotas.find((item) => item.feature === feature);
    features[feature] = quota?.limit === null || (quota?.remaining ?? 0) > 0;
  }
  for (const feature of CAPABILITY_FEATURES) {
    features[feature] = featureEnabled(plan, feature);
  }
  return {
    userId: user.id,
    plan,
    displayPlan: displayPlan(user),
    quotas,
    features,
  };
}

export async function getUserEntitlements(
  userId: string,
): Promise<UserEntitlements | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });
  if (!user) return null;
  const plan = entitlementPlan(user);
  const quotas = await getQuotaStatuses(user.id, plan);
  return entitlementsFromUser(user, quotas);
}

export async function loadEntitlementUser(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
    },
  });
}

/**
 * Reserves one unit when the feature is metered. Unlimited plans return a
 * null reservation and do not write a usage row.
 */
export async function consumeUsage(
  user: EntitlementUser,
  feature: QuotaFeatureId,
  subjectId?: string | null,
) {
  const plan = entitlementPlan(user);
  const access = getFeatureAccess(plan, feature);
  if (access.kind !== "quota") {
    throw new ProRequiredError(feature, displayPlan(user));
  }
  if (access.limit === null) {
    return { reservationId: null as string | null, reused: false };
  }

  const reserved = await reserveUsage({
    userId: user.id,
    feature,
    limit: access.limit,
    subjectId,
  });
  if (!reserved.ok) {
    throw new QuotaExceededError({
      feature,
      limit: reserved.limit,
      used: reserved.used,
      resetAt: reserved.resetAt,
    });
  }
  return {
    reservationId: reserved.reservationId,
    reused: reserved.reused,
  };
}

export async function requireFeature(
  user: EntitlementUser,
  feature: FeatureId,
) {
  const plan = entitlementPlan(user);
  const access = getFeatureAccess(plan, feature);
  if (access.kind === "flag" && !access.enabled) {
    const current = displayPlan(user);
    if (feature === "pdf_export" || feature === "listening") {
      throw new ProRequiredError(feature, current);
    }
    throw new PremiumRequiredError(feature, current);
  }
  return plan;
}

export async function runWithUsage<T>(
  user: EntitlementUser,
  feature: QuotaFeatureId,
  fn: () => Promise<T>,
  subjectId?: string | null,
): Promise<T> {
  const reservation = await consumeUsage(user, feature, subjectId);
  try {
    const result = await fn();
    if (!reservation.reused) {
      await finalizeUsageReservation(reservation.reservationId);
    }
    return result;
  } catch (error) {
    if (!reservation.reused) {
      await refundUsageReservation(reservation.reservationId);
    }
    throw error;
  }
}

/**
 * Multi-step actions share one reservation via subjectId.
 * The last successful step finalizes it. Any failure refunds it once.
 */
export async function runSharedUsage<T>(
  user: EntitlementUser,
  feature: QuotaFeatureId,
  subjectId: string,
  fn: () => Promise<T>,
  options?: { finalize?: boolean },
): Promise<T> {
  const reservation = await consumeUsage(user, feature, subjectId);
  try {
    const result = await fn();
    if (options?.finalize !== false) {
      await finalizeUsageReservation(reservation.reservationId);
    }
    return result;
  } catch (error) {
    await refundUsageReservation(reservation.reservationId);
    throw error;
  }
}

export { finalizeUsageReservation, refundUsageReservation };
