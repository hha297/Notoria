"use client";

import { useProAccess } from "@/components/billing/pro-access-provider";
import type { QuotaFeatureId } from "@/lib/billing/plans";
import {
  findQuota,
  isQuotaExhausted,
  isQuotaUnlimited,
  nextPlanThatIncreasesQuota,
} from "@/lib/billing/quota-ui";

/** Client gate for a metered AI feature. Backend still enforces. */
export function useQuotaFeature(feature: QuotaFeatureId) {
  const { plan, quotas, refreshQuotas, openUpgrade } = useProAccess();
  const quota = findQuota(quotas, feature);
  const unlimited = isQuotaUnlimited(quota);
  const exhausted = isQuotaExhausted(quota);
  const upgradePlan = nextPlanThatIncreasesQuota(plan, feature);

  return {
    plan,
    quota,
    unlimited,
    exhausted,
    remaining: quota?.remaining ?? null,
    resetAt: quota?.resetAt ?? null,
    upgradePlan,
    canUpgrade: upgradePlan != null,
    openUpgrade,
    refreshQuotas,
  };
}
