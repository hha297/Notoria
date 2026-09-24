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
  /** Future paid plan after period end (e.g. Premium → Pro). Null if none. */
  scheduledPlan: PlanId | null;
  hasStripeCustomer: boolean;
  /** Server-side: user has never consumed the lifetime first-month intro offer. */
  introOfferEligible: boolean;
  quotas: QuotaStatus[];
};
