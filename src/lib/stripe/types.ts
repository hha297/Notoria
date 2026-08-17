export type SubscriptionPlan = "free" | "pro";

export type BillingState = {
  isPro: boolean;
  plan: SubscriptionPlan;
  status: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
};
