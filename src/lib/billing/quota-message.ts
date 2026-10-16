import type { PlanId, QuotaFeatureId } from "@/lib/billing/plans";
import { nextPlanThatIncreasesQuota } from "@/lib/billing/quota-ui";

export type QuotaMessageParams = {
  plan: PlanId;
  feature: QuotaFeatureId;
  resetAt?: string | null;
};

/**
 * Picks a localized message key under billing.quotaMessages.*
 * Upgrade is only suggested when a higher plan raises this feature’s limit.
 */
export function resolveQuotaMessageKey(input: QuotaMessageParams): {
  messageKey: string;
  upgradePlan: PlanId | null;
} {
  const upgradePlan = nextPlanThatIncreasesQuota(input.plan, input.feature);
  const planKey =
    input.plan === "premium"
      ? "premium"
      : input.plan === "pro"
        ? "pro"
        : "free";
  const specific = `quotaMessages.${input.feature}.${planKey}`;
  return {
    messageKey: specific,
    upgradePlan,
  };
}
