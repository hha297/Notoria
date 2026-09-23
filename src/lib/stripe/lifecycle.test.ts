import { describe, expect, it } from "vitest";
import { displayPlan, getFeatureAccess } from "@/lib/billing/plans";
import {
  accountBillingActions,
  checkoutSessionParams,
  isDuplicateWebhookClaim,
  parseBillingCommand,
  planDialogCta,
  resolveBillingCommand,
  shouldApplyIncomingSubscription,
  stripeKeyMode,
  subscriptionChangeConfirmed,
  subscriptionRecordFromStripe,
  switchUpdateParams,
  validateConfiguredPrice,
  PLAN_SWITCH_PRORATION,
} from "@/lib/stripe/lifecycle";

const env = {
  proPriceIds: ["price_pro"],
  premiumPriceId: "price_premium",
};

const monthlyEur = {
  active: true,
  livemode: false,
  currency: "eur",
  type: "recurring",
  interval: "month",
};

describe("billing commands", () => {
  it("rejects an invalid plan and ignores a client price id", () => {
    expect(parseBillingCommand({ plan: "enterprise", priceId: "price_evil" })).toEqual({
      ok: false,
      code: "INVALID_PLAN",
    });
    const parsed = parseBillingCommand({ plan: "pro", priceId: "price_evil" });
    expect(parsed).toEqual({ ok: true, command: { intent: "change", plan: "pro" } });
  });

  it("sends a free user to Checkout for Pro and Premium", () => {
    expect(
      resolveBillingCommand({
        currentPlan: "free",
        hasEntitledSubscription: false,
        command: { intent: "change", plan: "pro" },
      }),
    ).toEqual({ action: "checkout", plan: "pro", expect: "pro" });
    expect(
      resolveBillingCommand({
        currentPlan: "free",
        hasEntitledSubscription: false,
        command: { intent: "change", plan: "premium" },
      }),
    ).toEqual({ action: "checkout", plan: "premium", expect: "premium" });
  });

  it("upgrades immediately and schedules Premium → Pro at period end", () => {
    expect(
      resolveBillingCommand({
        currentPlan: "pro",
        hasEntitledSubscription: true,
        command: { intent: "change", plan: "premium" },
      }),
    ).toEqual({ action: "switch", plan: "premium", expect: "premium" });
    expect(
      resolveBillingCommand({
        currentPlan: "premium",
        hasEntitledSubscription: true,
        command: { intent: "change", plan: "pro" },
      }),
    ).toEqual({ action: "scheduleDowngrade", plan: "pro", expect: "schedule_pro" });
  });

  it("schedules cancellation for a move to Free and can undo it", () => {
    expect(
      resolveBillingCommand({
        currentPlan: "pro",
        hasEntitledSubscription: true,
        command: { intent: "change", plan: "free" },
      }),
    ).toEqual({ action: "cancel", expect: "cancel" });
    expect(
      resolveBillingCommand({
        currentPlan: "premium",
        hasEntitledSubscription: true,
        command: { intent: "change", plan: "free" },
      }),
    ).toEqual({ action: "cancel", expect: "cancel" });
    expect(
      resolveBillingCommand({
        currentPlan: "pro",
        hasEntitledSubscription: true,
        command: { intent: "resume" },
      }),
    ).toEqual({ action: "resume", expect: "resume" });
    expect(
      resolveBillingCommand({
        currentPlan: "free",
        hasEntitledSubscription: false,
        command: { intent: "change", plan: "free" },
      }),
    ).toEqual({ action: "reject", code: "ALREADY_SUBSCRIBED" });
    expect(
      resolveBillingCommand({
        currentPlan: "pro",
        hasEntitledSubscription: false,
        command: { intent: "change", plan: "free" },
      }),
    ).toEqual({ action: "reject", code: "NO_SUBSCRIPTION" });
  });

  it("builds Checkout and switch params from the server price only", () => {
    const checkout = checkoutSessionParams({
      priceId: "price_pro",
      userId: "user_1",
      plan: "pro",
      customerId: "cus_1",
      successUrl: "https://app.test/account?billing=confirming&expect=pro",
      cancelUrl: "https://app.test/account?billing=canceled",
    });
    expect(checkout.mode).toBe("subscription");
    expect(checkout.line_items).toEqual([{ price: "price_pro", quantity: 1 }]);
    expect(checkout.customer).toBe("cus_1");
    expect(checkout).not.toHaveProperty("customer_email");

    const update = switchUpdateParams({
      itemId: "si_1",
      priceId: "price_premium",
      userId: "user_1",
      plan: "premium",
    });
    expect(update.proration_behavior).toBe(PLAN_SWITCH_PRORATION);
    expect(update.payment_behavior).toBe("error_if_incomplete");
    expect(update.cancel_at_period_end).toBe(false);
    expect(update.items).toEqual([{ id: "si_1", price: "price_premium" }]);
  });
});

describe("configured price checks", () => {
  it("accepts an active monthly EUR test price with a test key", () => {
    expect(stripeKeyMode("sk_test_123")).toBe("test");
    expect(stripeKeyMode("sk_live_123")).toBe("live");
    expect(validateConfiguredPrice(monthlyEur, "test")).toEqual({ ok: true });
  });

  it("fails closed when the price is missing, inactive, or from the other mode", () => {
    expect(validateConfiguredPrice(null, "test").ok).toBe(false);
    expect(validateConfiguredPrice(null, "test")).toMatchObject({ code: "PRICE_NOT_FOUND" });
    expect(validateConfiguredPrice({ ...monthlyEur, active: false }, "test")).toMatchObject({
      code: "PRICE_INACTIVE",
    });
    expect(validateConfiguredPrice({ ...monthlyEur, livemode: true }, "test")).toMatchObject({
      code: "PRICE_MODE_MISMATCH",
    });
    expect(validateConfiguredPrice(monthlyEur, "live")).toMatchObject({
      code: "PRICE_MODE_MISMATCH",
    });
    expect(validateConfiguredPrice({ ...monthlyEur, currency: "usd" }, "test")).toMatchObject({
      code: "PRICE_CURRENCY",
    });
    expect(validateConfiguredPrice({ ...monthlyEur, interval: "year" }, "test")).toMatchObject({
      code: "PRICE_INTERVAL",
    });
  });
});

describe("subscription sync", () => {
  it("keeps Pro until period end when cancellation is scheduled", () => {
    const row = subscriptionRecordFromStripe({
      status: "active",
      priceId: "price_pro",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-10-23T00:00:00.000Z"),
      customerId: "cus_1",
      subscriptionId: "sub_1",
      scheduledPlan: null,
      scheduleId: null,
      env,
    });
    expect(row.subscriptionPlan).toBe("pro");
    expect(row.stripeCancelAtPeriodEnd).toBe(true);
    expect(displayPlan(row)).toBe("pro");
    expect(getFeatureAccess("pro", "ai_meeting")).toEqual({ kind: "quota", limit: null });
  });

  it("keeps Premium when a Pro downgrade is scheduled", () => {
    const row = subscriptionRecordFromStripe({
      status: "active",
      priceId: "price_premium",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date("2026-10-23T00:00:00.000Z"),
      customerId: "cus_1",
      subscriptionId: "sub_1",
      scheduledPlan: "pro",
      scheduleId: "sub_sched_1",
      env,
    });
    expect(row.subscriptionPlan).toBe("premium");
    expect(row.scheduledSubscriptionPlan).toBe("pro");
    expect(row.stripeCancelAtPeriodEnd).toBe(false);
    expect(displayPlan(row)).toBe("premium");
    expect(getFeatureAccess("premium", "ai_learning_coach")).toEqual({
      kind: "flag",
      enabled: true,
    });
  });

  it("maps a premium price and clears cancellation after the subscription ends", () => {
    expect(
      subscriptionRecordFromStripe({
        status: "active",
        priceId: "price_premium",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-10-23T00:00:00.000Z"),
        customerId: "cus_1",
        subscriptionId: "sub_1",
        scheduledPlan: null,
        scheduleId: null,
        env,
      }).subscriptionPlan,
    ).toBe("premium");

    const ended = subscriptionRecordFromStripe({
      status: "canceled",
      priceId: "price_premium",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-10-23T00:00:00.000Z"),
      customerId: "cus_1",
      subscriptionId: "sub_1",
      scheduledPlan: null,
      scheduleId: null,
      env,
    });
    expect(ended.subscriptionPlan).toBe("free");
    expect(ended.stripeCancelAtPeriodEnd).toBe(false);
  });

  it("ignores a stale subscription event and a duplicate webhook claim", () => {
    expect(
      shouldApplyIncomingSubscription({
        storedSubscriptionId: "sub_new",
        storedStatus: "active",
        incomingId: "sub_old",
        incomingStatus: "canceled",
      }),
    ).toBe(false);
    expect(
      shouldApplyIncomingSubscription({
        storedSubscriptionId: "sub_current",
        storedStatus: "active",
        incomingId: "sub_other",
        incomingStatus: "active",
      }),
    ).toBe(false);
    expect(
      shouldApplyIncomingSubscription({
        storedSubscriptionId: "sub_old",
        storedStatus: "canceled",
        incomingId: "sub_new",
        incomingStatus: "active",
      }),
    ).toBe(true);
    expect(isDuplicateWebhookClaim([])).toBe(true);
    expect(isDuplicateWebhookClaim(["evt_1"])).toBe(false);
  });

  it("confirms a change only from the synced plan, not from the click", () => {
    expect(
      subscriptionChangeConfirmed("premium", { plan: "pro", cancelAtPeriodEnd: false }),
    ).toBe(false);
    expect(
      subscriptionChangeConfirmed("premium", { plan: "premium", cancelAtPeriodEnd: false }),
    ).toBe(true);
    expect(
      subscriptionChangeConfirmed("cancel", { plan: "pro", cancelAtPeriodEnd: true }),
    ).toBe(true);
    expect(
      subscriptionChangeConfirmed("cancel", { plan: "free", cancelAtPeriodEnd: false }),
    ).toBe(false);
    expect(
      subscriptionChangeConfirmed("resume", { plan: "premium", cancelAtPeriodEnd: false }),
    ).toBe(true);
    expect(
      subscriptionChangeConfirmed("schedule_pro", {
        plan: "premium",
        cancelAtPeriodEnd: false,
        scheduledPlan: "pro",
      }),
    ).toBe(true);
    expect(
      subscriptionChangeConfirmed("schedule_pro", {
        plan: "pro",
        cancelAtPeriodEnd: false,
        scheduledPlan: null,
      }),
    ).toBe(false);
  });
});

describe("billing UI state", () => {
  it("shows the actions for each subscription state", () => {
    expect(
      accountBillingActions({ plan: "free", cancelAtPeriodEnd: false, hasStripeCustomer: false }),
    ).toEqual(["upgrade"]);
    expect(
      accountBillingActions({ plan: "pro", cancelAtPeriodEnd: false, hasStripeCustomer: true }),
    ).toEqual(["changePlan", "manageBilling"]);
    expect(
      accountBillingActions({ plan: "pro", cancelAtPeriodEnd: true, hasStripeCustomer: true }),
    ).toEqual(["keep", "manageBilling"]);
    expect(
      accountBillingActions({ plan: "premium", cancelAtPeriodEnd: false, hasStripeCustomer: true }),
    ).toEqual(["changePlan", "manageBilling", "openCoach"]);
    expect(
      accountBillingActions({
        plan: "premium",
        cancelAtPeriodEnd: false,
        scheduledPlan: "pro",
        hasStripeCustomer: true,
      }),
    ).toEqual(["keep", "manageBilling", "openCoach"]);
    expect(
      accountBillingActions({ plan: "premium", cancelAtPeriodEnd: true, hasStripeCustomer: true }),
    ).toEqual(["keep", "manageBilling", "openCoach"]);
  });

  it("labels each plan change with the Stripe consequence", () => {
    expect(planDialogCta({ current: "free", selected: "pro", cancelAtPeriodEnd: false })).toEqual({
      kind: "checkout",
      label: "upgrade",
    });
    expect(
      planDialogCta({ current: "free", selected: "premium", cancelAtPeriodEnd: false }),
    ).toEqual({ kind: "checkout", label: "upgradeToPremium" });
    expect(planDialogCta({ current: "pro", selected: "premium", cancelAtPeriodEnd: false })).toEqual({
      kind: "upgrade",
      label: "upgradeToPremium",
    });
    expect(
      planDialogCta({ current: "premium", selected: "pro", cancelAtPeriodEnd: false }),
    ).toEqual({ kind: "switch", label: "switchToPro" });
    expect(planDialogCta({ current: "pro", selected: "free", cancelAtPeriodEnd: false })).toEqual({
      kind: "cancel",
      label: "switchToFree",
    });
    expect(
      planDialogCta({ current: "premium", selected: "free", cancelAtPeriodEnd: false }),
    ).toEqual({ kind: "cancel", label: "switchToFree" });
    expect(planDialogCta({ current: "pro", selected: "pro", cancelAtPeriodEnd: true })).toEqual({
      kind: "keep",
      label: "keepPro",
    });
    expect(
      planDialogCta({ current: "premium", selected: "premium", cancelAtPeriodEnd: true }),
    ).toEqual({ kind: "keep", label: "keepPremium" });
    expect(
      planDialogCta({
        current: "premium",
        selected: "premium",
        cancelAtPeriodEnd: false,
        scheduledPlan: "pro",
      }),
    ).toEqual({ kind: "keep", label: "keepPremium" });
    expect(planDialogCta({ current: "pro", selected: "pro", cancelAtPeriodEnd: false })).toEqual({
      kind: "none",
    });
    expect(planDialogCta({ current: "pro", selected: "free", cancelAtPeriodEnd: true })).toEqual({
      kind: "none",
    });
    expect(
      planDialogCta({
        current: "premium",
        selected: "pro",
        cancelAtPeriodEnd: false,
        scheduledPlan: "pro",
      }),
    ).toEqual({ kind: "none" });
  });
});
