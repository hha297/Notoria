import {
  PLAN_DAILY_QUOTAS,
  PLAN_IDS,
  type PlanId,
  type QuotaFeatureId,
  type QuotaStatus,
} from "@/lib/billing/plans";

/** True when the feature has a finite daily allowance and used >= limit. */
export function isQuotaExhausted(
  quota: Pick<QuotaStatus, "limit" | "remaining" | "used"> | null | undefined,
): boolean {
  if (!quota || quota.limit == null) return false;
  if (quota.remaining != null) return quota.remaining <= 0;
  return quota.used >= quota.limit;
}

export function isQuotaUnlimited(
  quota: Pick<QuotaStatus, "limit"> | null | undefined,
): boolean {
  return quota != null && quota.limit === null;
}

/** 0–100 for progress bars; unlimited → null (no bar). */
export function quotaProgressPercent(
  used: number,
  limit: number | null | undefined,
): number | null {
  if (limit == null || limit <= 0) return null;
  return Math.min(100, Math.round((Math.max(0, used) / limit) * 100));
}

/**
 * Next plan that actually raises this feature’s allowance.
 * Free→Pro only if Pro limit is higher (or unlimited); Pro→Premium same.
 */
export function nextPlanThatIncreasesQuota(
  currentPlan: PlanId,
  feature: QuotaFeatureId,
): PlanId | null {
  const current = PLAN_DAILY_QUOTAS[currentPlan][feature];
  const order = PLAN_IDS;
  const start = order.indexOf(currentPlan);
  for (let i = start + 1; i < order.length; i += 1) {
    const plan = order[i]!;
    const next = PLAN_DAILY_QUOTAS[plan][feature];
    if (next === null && current !== null) return plan;
    if (
      typeof next === "number" &&
      typeof current === "number" &&
      next > current
    ) {
      return plan;
    }
    if (typeof next === "number" && current === null) {
      // Already unlimited — no upgrade improves this feature.
      continue;
    }
  }
  return null;
}

export function findQuota(
  quotas: QuotaStatus[],
  feature: QuotaFeatureId,
): QuotaStatus | undefined {
  return quotas.find((item) => item.feature === feature);
}

/** Features to show in the account “usage today” grid for the active plan. */
export function usageFeaturesForPlan(plan: PlanId): QuotaFeatureId[] {
  if (plan === "free") {
    return (
      Object.entries(PLAN_DAILY_QUOTAS.free) as Array<
        [QuotaFeatureId, number | null]
      >
    )
      .filter(
        ([feature, limit]) =>
          feature !== "ai_learning_coach_chat" &&
          typeof limit === "number" &&
          limit > 0,
      )
      .map(([feature]) => feature);
  }
  if (plan === "pro") {
    return (
      Object.entries(PLAN_DAILY_QUOTAS.pro) as Array<
        [QuotaFeatureId, number | null]
      >
    )
      .filter(
        ([feature, limit]) =>
          feature !== "ai_learning_coach_chat" &&
          (limit === null || (typeof limit === "number" && limit > 0)),
      )
      .map(([feature]) => feature);
  }
  // Premium: show finite coach chat + unlimited toolkit markers via UI.
  return (
    Object.entries(PLAN_DAILY_QUOTAS.premium) as Array<
      [QuotaFeatureId, number | null]
    >
  )
    .filter(
      ([, limit]) => limit === null || (typeof limit === "number" && limit > 0),
    )
    .map(([feature]) => feature);
}
