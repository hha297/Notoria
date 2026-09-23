import type { PlanId, QuotaStatus } from "@/lib/billing/plans";

export type SubscriptionPlan = PlanId;

export type BillingState = {
  /** Active Pro or Premium. */
  isPro: boolean;
  isPremium: boolean;
  plan: PlanId;
  status: string | null;
  currentPeriodEnd: string | null;
  /** Paid access continues until currentPeriodEnd. This is not Free. */
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  quotas: QuotaStatus[];
};
