import { PAID_ACCESS_STATUSES, planForStripePrice, planRank, type PlanId, type StripePriceEnv } from "@/lib/billing/plans";

/**
 * Upgrades (Pro → Premium) are immediate Stripe subscription updates with
 * proration. Downgrades (Premium → Pro) are scheduled at period end via a
 * Subscription Schedule so Premium entitlements stay until then.
 * Moving to Free schedules cancel_at_period_end (access until period end).
 */
export const PLAN_SWITCH_PRORATION = "always_invoice" as const;

export type BillingExpect =
  | "pro"
  | "premium"
  | "cancel"
  | "resume"
  | "schedule_pro";

export type BillingCommand =
  | { intent: "change"; plan: PlanId }
  | { intent: "resume" };

export type ResolvedBillingCommand =
  | { action: "checkout"; plan: "pro" | "premium"; expect: "pro" | "premium" }
  | { action: "switch"; plan: "pro" | "premium"; expect: "pro" | "premium" }
  | {
      action: "scheduleDowngrade";
      plan: "pro";
      expect: "schedule_pro";
    }
  | { action: "cancel"; expect: "cancel" }
  | { action: "resume"; expect: "resume" }
  | { action: "reject"; code: "ALREADY_SUBSCRIBED" | "NO_SUBSCRIPTION" | "INVALID_PLAN" };

export type PriceCheck = {
  active: boolean;
  livemode: boolean;
  currency: string;
  type: string;
  interval: string | null;
};

export type SubscriptionSyncInput = {
  status: string;
  priceId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  customerId: string | null;
  subscriptionId: string;
  /** Future paid plan after period end, when a schedule is active. */
  scheduledPlan: PlanId | null;
  scheduleId: string | null;
  env: StripePriceEnv;
};

const EXPECTS = new Set<BillingExpect>([
  "pro",
  "premium",
  "cancel",
  "resume",
  "schedule_pro",
]);

export function isBillingExpect(value: string | null | undefined): value is BillingExpect {
  return Boolean(value && EXPECTS.has(value as BillingExpect));
}

export function stripeKeyMode(secret: string): "test" | "live" | "unknown" {
  if (secret.startsWith("sk_test_") || secret.startsWith("rk_test_")) return "test";
  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) return "live";
  return "unknown";
}

export function parseBillingCommand(body: unknown):
  | { ok: true; command: BillingCommand }
  | { ok: false; code: "INVALID_PLAN" } {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "INVALID_PLAN" };
  }
  const record = body as Record<string, unknown>;
  if (record.intent === "resume") {
    return { ok: true, command: { intent: "resume" } };
  }
  const plan = record.plan;
  if (plan === "free" || plan === "pro" || plan === "premium") {
    return { ok: true, command: { intent: "change", plan } };
  }
  return { ok: false, code: "INVALID_PLAN" };
}

/**
 * The client names an internal plan. The server decides Checkout vs update vs
 * schedule vs cancel. A requested price id on the body is ignored.
 */
export function resolveBillingCommand(input: {
  currentPlan: PlanId;
  hasEntitledSubscription: boolean;
  command: BillingCommand;
}): ResolvedBillingCommand {
  if (input.command.intent === "resume") {
    if (!input.hasEntitledSubscription) {
      return { action: "reject", code: "NO_SUBSCRIPTION" };
    }
    return { action: "resume", expect: "resume" };
  }

  const target = input.command.plan;
  if (target === input.currentPlan) {
    return { action: "reject", code: "ALREADY_SUBSCRIBED" };
  }

  if (target === "free") {
    if (!input.hasEntitledSubscription) {
      return { action: "reject", code: "NO_SUBSCRIPTION" };
    }
    return { action: "cancel", expect: "cancel" };
  }

  if (!input.hasEntitledSubscription) {
    return { action: "checkout", plan: target, expect: target };
  }

  // Paid → paid: upgrade now, downgrade at period end.
  if (planRank(target) > planRank(input.currentPlan)) {
    return { action: "switch", plan: target, expect: target };
  }

  if (target === "pro" && input.currentPlan === "premium") {
    return { action: "scheduleDowngrade", plan: "pro", expect: "schedule_pro" };
  }

  return { action: "reject", code: "INVALID_PLAN" };
}

export function validateConfiguredPrice(
  price: PriceCheck | null,
  keyMode: "test" | "live" | "unknown",
):
  | { ok: true }
  | {
      ok: false;
      code:
        | "PRICE_NOT_FOUND"
        | "PRICE_INACTIVE"
        | "PRICE_MODE_MISMATCH"
        | "PRICE_CURRENCY"
        | "PRICE_INTERVAL";
    } {
  if (!price) return { ok: false, code: "PRICE_NOT_FOUND" };
  if (!price.active) return { ok: false, code: "PRICE_INACTIVE" };
  const priceMode = price.livemode ? "live" : "test";
  if (keyMode === "unknown" || keyMode !== priceMode) {
    return { ok: false, code: "PRICE_MODE_MISMATCH" };
  }
  if (price.currency.toLowerCase() !== "eur") {
    return { ok: false, code: "PRICE_CURRENCY" };
  }
  if (price.type !== "recurring" || price.interval !== "month") {
    return { ok: false, code: "PRICE_INTERVAL" };
  }
  return { ok: true };
}

export function switchUpdateParams(input: {
  itemId: string;
  priceId: string;
  userId: string;
  plan: "pro" | "premium";
}) {
  return {
    items: [{ id: input.itemId, price: input.priceId }],
    proration_behavior: PLAN_SWITCH_PRORATION,
    cancel_at_period_end: false,
    payment_behavior: "error_if_incomplete" as const,
    metadata: {
      userId: input.userId,
      plan: input.plan,
      scheduledPlan: "",
    },
  };
}

export function checkoutSessionParams(input: {
  priceId: string;
  userId: string;
  plan: "pro" | "premium";
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return {
    mode: "subscription" as const,
    customer: input.customerId,
    client_reference_id: input.userId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      userId: input.userId,
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        plan: input.plan,
      },
    },
  };
}

export function subscriptionRecordFromStripe(input: SubscriptionSyncInput) {
  const plan = planForStripePrice(input.status, input.priceId, input.env);
  const entitled = plan !== "free";
  const scheduled =
    entitled &&
    input.scheduledPlan &&
    input.scheduledPlan !== "free" &&
    input.scheduledPlan !== plan
      ? input.scheduledPlan
      : null;
  return {
    subscriptionPlan: plan,
    subscriptionStatus: input.status,
    stripeCustomerId: input.customerId,
    stripeSubscriptionId: input.subscriptionId,
    stripeCurrentPeriodEnd: input.currentPeriodEnd,
    stripeCancelAtPeriodEnd: entitled && input.cancelAtPeriodEnd && !scheduled,
    scheduledSubscriptionPlan: scheduled,
    stripeScheduleId: scheduled ? input.scheduleId : null,
  };
}

/**
 * A later event for a different subscription must not wipe the current one.
 * A deleted older subscription is ignored while another entitled subscription is stored.
 * A new entitled subscription may replace a stored subscription that no longer grants access.
 */
export function shouldApplyIncomingSubscription(input: {
  storedSubscriptionId: string | null;
  storedStatus: string | null;
  incomingId: string;
  incomingStatus: string;
}) {
  if (!input.storedSubscriptionId || input.storedSubscriptionId === input.incomingId) {
    return true;
  }
  const incomingEntitled = PAID_ACCESS_STATUSES.has(input.incomingStatus);
  const storedEntitled = Boolean(
    input.storedStatus && PAID_ACCESS_STATUSES.has(input.storedStatus),
  );
  if (!incomingEntitled || storedEntitled) return false;
  return true;
}

export function subscriptionChangeConfirmed(
  expect: BillingExpect,
  state: {
    plan: PlanId;
    cancelAtPeriodEnd: boolean;
    scheduledPlan?: PlanId | null;
  },
) {
  if (expect === "cancel") {
    return state.cancelAtPeriodEnd && state.plan !== "free";
  }
  if (expect === "resume") {
    return (
      !state.cancelAtPeriodEnd &&
      state.plan !== "free" &&
      !state.scheduledPlan
    );
  }
  if (expect === "schedule_pro") {
    return state.plan === "premium" && state.scheduledPlan === "pro";
  }
  return (
    state.plan === expect &&
    !state.cancelAtPeriodEnd &&
    !state.scheduledPlan
  );
}

export type AccountBillingAction = "upgrade" | "changePlan" | "keep" | "manageBilling" | "openCoach";

export function accountBillingActions(input: {
  plan: PlanId;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  scheduledPlan?: PlanId | null;
}): AccountBillingAction[] {
  if (input.plan === "free") {
    return input.hasStripeCustomer ? ["upgrade", "manageBilling"] : ["upgrade"];
  }
  if (input.cancelAtPeriodEnd || input.scheduledPlan) {
    return input.plan === "premium"
      ? ["keep", "manageBilling", "openCoach"]
      : ["keep", "manageBilling"];
  }
  return input.plan === "premium"
    ? ["changePlan", "manageBilling", "openCoach"]
    : ["changePlan", "manageBilling"];
}

export type PlanDialogCta =
  | { kind: "none" }
  | { kind: "checkout"; label: "upgrade" | "upgradeToPremium" }
  | { kind: "upgrade"; label: "upgrade" | "upgradeToPremium" }
  | { kind: "switch"; label: "switchToPro" | "switchToFree" }
  | { kind: "cancel"; label: "switchToFree" }
  | { kind: "keep"; label: "keepPro" | "keepPremium" };

export function planDialogCta(input: {
  current: PlanId;
  selected: PlanId;
  cancelAtPeriodEnd: boolean;
  scheduledPlan?: PlanId | null;
}): PlanDialogCta {
  const pendingChange = Boolean(input.cancelAtPeriodEnd || input.scheduledPlan);
  if (input.selected === input.current) {
    if (!pendingChange || input.current === "free") return { kind: "none" };
    return {
      kind: "keep",
      label: input.current === "premium" ? "keepPremium" : "keepPro",
    };
  }

  // Destination already scheduled — no second Switch/Cancel.
  if (input.cancelAtPeriodEnd && input.selected === "free") {
    return { kind: "none" };
  }
  if (input.scheduledPlan && input.selected === input.scheduledPlan) {
    return { kind: "none" };
  }

  if (input.current === "free") {
    return {
      kind: "checkout",
      label: input.selected === "premium" ? "upgradeToPremium" : "upgrade",
    };
  }
  if (input.selected === "free") {
    return { kind: "cancel", label: "switchToFree" };
  }
  if (planRank(input.selected) > planRank(input.current)) {
    return {
      kind: "upgrade",
      label: input.selected === "premium" ? "upgradeToPremium" : "upgrade",
    };
  }
  return { kind: "switch", label: "switchToPro" };
}

export function isDuplicateWebhookClaim(insertedIds: string[]) {
  return insertedIds.length === 0;
}
