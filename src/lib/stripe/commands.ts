import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { displayPlan, isIntroOfferEligible, PAID_ACCESS_STATUSES } from "@/lib/billing/plans";
import { getStripeClient } from "@/lib/stripe/client";
import {
  getAppBaseUrl,
  getStripePremiumPriceId,
  getStripeProPriceId,
  getStripeSecretKey,
  stripeIntroCouponId,
  StripeConfigError,
} from "@/lib/stripe/config";
import {
  checkoutSessionParams,
  resolveBillingCommand,
  stripeKeyMode,
  switchUpdateParams,
  validateConfiguredPrice,
  type BillingCommand,
  type PriceCheck,
} from "@/lib/stripe/lifecycle";
import {
  planFromStripeStatus,
  subscriptionPeriodEnd,
  subscriptionPriceId,
} from "@/lib/stripe/subscription";

export class BillingCommandError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "BillingCommandError";
    this.code = code;
    this.status = status;
  }
}

function priceIdForPlan(plan: "pro" | "premium") {
  return plan === "premium" ? getStripePremiumPriceId() : getStripeProPriceId();
}

function isMissingResource(error: unknown) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

export function billingFailureCode(error: unknown) {
  if (error instanceof BillingCommandError) return error.code;
  if (error instanceof StripeConfigError) return "STRIPE_NOT_CONFIGURED";
  if (isMissingResource(error)) return "PRICE_NOT_FOUND";
  if (error instanceof Stripe.errors.StripeCardError) return "PAYMENT_FAILED";
  const code =
    error instanceof Stripe.errors.StripeError ? error.code : undefined;
  if (
    code === "card_declined" ||
    code === "invoice_payment_intent_requires_action" ||
    code === "payment_intent_payment_attempt_failed" ||
    code === "subscription_payment_intent_requires_action"
  ) {
    return "PAYMENT_FAILED";
  }
  return "CHECKOUT_FAILED";
}

export function billingFailureStatus(error: unknown) {
  if (error instanceof BillingCommandError) return error.status;
  if (error instanceof StripeConfigError) return 503;
  if (billingFailureCode(error) === "PAYMENT_FAILED") return 402;
  if (billingFailureCode(error) === "PRICE_NOT_FOUND") return 422;
  return 500;
}

async function loadPrice(stripe: Stripe, priceId: string): Promise<PriceCheck | null> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return {
      active: price.active,
      livemode: price.livemode,
      currency: price.currency,
      type: price.type,
      interval: price.recurring?.interval ?? null,
    };
  } catch (error) {
    if (isMissingResource(error)) return null;
    throw error;
  }
}

async function assertPrice(stripe: Stripe, plan: "pro" | "premium") {
  const priceId = priceIdForPlan(plan);
  const price = await loadPrice(stripe, priceId);
  const check = validateConfiguredPrice(price, stripeKeyMode(getStripeSecretKey()));
  if (!check.ok) {
    console.error("Stripe price rejected", { plan, code: check.code });
    throw new BillingCommandError(check.code, check.code === "PRICE_NOT_FOUND" ? 422 : 422);
  }
  return priceId;
}

async function ensureCustomer(input: {
  stripe: Stripe;
  userId: string;
  email: string;
  stripeCustomerId: string | null;
}) {
  if (input.stripeCustomerId) return input.stripeCustomerId;

  const existing = await input.stripe.customers.list({
    email: input.email,
    limit: 10,
  });
  const match =
    existing.data.find((customer) => customer.metadata?.userId === input.userId) ??
    existing.data[0];

  const customer =
    match ??
    (await input.stripe.customers.create({
      email: input.email,
      metadata: { userId: input.userId },
    }));

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, input.userId));

  return customer.id;
}

function pickEntitledSubscription(
  subscriptions: Stripe.Subscription[],
  storedSubscriptionId: string | null,
) {
  const entitled = subscriptions.filter((subscription) =>
    PAID_ACCESS_STATUSES.has(subscription.status),
  );
  if (entitled.length > 1) {
    console.warn("Multiple entitled Stripe subscriptions", { count: entitled.length });
  }
  if (storedSubscriptionId) {
    const stored = entitled.find((subscription) => subscription.id === storedSubscriptionId);
    if (stored) return stored;
  }
  return entitled[0] ?? null;
}

function scheduleIdOf(subscription: Stripe.Subscription) {
  const schedule = subscription.schedule;
  if (!schedule) return null;
  return typeof schedule === "string" ? schedule : schedule.id;
}

async function releaseSubscriptionSchedule(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const scheduleId = scheduleIdOf(subscription);
  if (!scheduleId) return;
  try {
    await stripe.subscriptionSchedules.release(scheduleId);
  } catch (error) {
    if (!isMissingResource(error)) throw error;
  }
}

/**
 * Keep the current price through current_period_end, then switch to the
 * target price. Premium entitlements stay until Stripe applies the new phase.
 */
async function scheduleDowngradeAtPeriodEnd(input: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
  targetPriceId: string;
  userId: string;
  plan: "pro";
}) {
  const currentPriceId = subscriptionPriceId(input.subscription);
  const periodEnd = subscriptionPeriodEnd(input.subscription);
  if (!currentPriceId || !periodEnd) {
    throw new BillingCommandError("CHECKOUT_FAILED", 500);
  }
  if (currentPriceId === input.targetPriceId) {
    throw new BillingCommandError("ALREADY_SUBSCRIBED", 409);
  }

  if (input.subscription.cancel_at_period_end) {
    await input.stripe.subscriptions.update(input.subscription.id, {
      cancel_at_period_end: false,
    });
  }

  let scheduleId = scheduleIdOf(input.subscription);
  if (!scheduleId) {
    const created = await input.stripe.subscriptionSchedules.create({
      from_subscription: input.subscription.id,
    });
    scheduleId = created.id;
  }

  const schedule = await input.stripe.subscriptionSchedules.retrieve(scheduleId);
  const phaseStart = schedule.phases[0]?.start_date;
  if (!phaseStart) {
    throw new BillingCommandError("CHECKOUT_FAILED", 500);
  }

  const endUnix = Math.floor(periodEnd.getTime() / 1000);

  await input.stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        items: [{ price: currentPriceId, quantity: 1 }],
        start_date: phaseStart,
        end_date: endUnix,
      },
      {
        items: [{ price: input.targetPriceId, quantity: 1 }],
      },
    ],
    metadata: {
      userId: input.userId,
      scheduledPlan: input.plan,
    },
  });

  await input.stripe.subscriptions.update(input.subscription.id, {
    metadata: {
      ...input.subscription.metadata,
      userId: input.userId,
      scheduledPlan: input.plan,
    },
  });

  console.info("Stripe downgrade scheduled at period end", {
    userId: input.userId,
    subscriptionId: input.subscription.id,
    scheduleId,
    targetPlan: input.plan,
    effectiveAt: periodEnd.toISOString(),
  });
}

/**
 * Asks Stripe to change billing. Does not write plan, status, or entitlements.
 * Those land through the webhook or a later retrieve-and-sync.
 */
export async function requestBillingChange(input: {
  userId: string;
  email: string;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** Lifetime intro flag — server-only eligibility. */
  introOfferUsedAt?: Date | string | null;
  command: BillingCommand;
}) {
  const stripe = getStripeClient();
  const customerId = await ensureCustomer({
    stripe,
    userId: input.userId,
    email: input.email,
    stripeCustomerId: input.stripeCustomerId,
  });

  const listed = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  const entitled = pickEntitledSubscription(listed.data, input.stripeSubscriptionId);
  const currentPlan = entitled
    ? planFromStripeStatus(entitled.status, subscriptionPriceId(entitled))
    : displayPlan({
        subscriptionPlan: input.subscriptionPlan,
        subscriptionStatus: input.subscriptionStatus,
      });

  const resolved = resolveBillingCommand({
    currentPlan,
    hasEntitledSubscription: Boolean(entitled),
    command: input.command,
  });

  if (resolved.action === "reject") {
    throw new BillingCommandError(
      resolved.code,
      resolved.code === "INVALID_PLAN" ? 400 : 409,
    );
  }

  const appUrl = getAppBaseUrl();

  console.info("Billing command resolved", {
    userId: input.userId,
    currentPlan,
    action: resolved.action,
    expect: "expect" in resolved ? resolved.expect : null,
  });

  if (resolved.action === "checkout") {
    const priceId = await assertPrice(stripe, resolved.plan);
    // Re-read eligibility at checkout time — never trust the client.
    const latest = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { introOfferUsedAt: true },
    });
    const eligible = isIntroOfferEligible(
      latest ?? { introOfferUsedAt: input.introOfferUsedAt },
    );
    const introCouponId = eligible
      ? stripeIntroCouponId(resolved.plan)
      : null;
    if (eligible && !introCouponId) {
      throw new StripeConfigError();
    }

    const session = await stripe.checkout.sessions.create(
      checkoutSessionParams({
        priceId,
        userId: input.userId,
        plan: resolved.plan,
        customerId,
        successUrl: `${appUrl}/account?billing=confirming&expect=${resolved.expect}`,
        cancelUrl: `${appUrl}/account?billing=canceled`,
        introCouponId,
      }),
    );
    if (!session.url) {
      throw new BillingCommandError("CHECKOUT_FAILED", 500);
    }
    return { url: session.url };
  }

  if (!entitled) {
    throw new BillingCommandError("NO_SUBSCRIPTION", 409);
  }

  if (resolved.action === "cancel") {
    await releaseSubscriptionSchedule(stripe, entitled);
    await stripe.subscriptions.update(entitled.id, {
      cancel_at_period_end: true,
      metadata: {
        ...entitled.metadata,
        userId: input.userId,
        scheduledPlan: "",
      },
    });
  } else if (resolved.action === "resume") {
    await releaseSubscriptionSchedule(stripe, entitled);
    await stripe.subscriptions.update(entitled.id, {
      cancel_at_period_end: false,
      metadata: {
        ...entitled.metadata,
        userId: input.userId,
        scheduledPlan: "",
      },
    });
  } else if (resolved.action === "scheduleDowngrade") {
    const priceId = await assertPrice(stripe, resolved.plan);
    await scheduleDowngradeAtPeriodEnd({
      stripe,
      subscription: entitled,
      targetPriceId: priceId,
      userId: input.userId,
      plan: resolved.plan,
    });
  } else {
    await releaseSubscriptionSchedule(stripe, entitled);
    const priceId = await assertPrice(stripe, resolved.plan);
    const item = entitled.items.data[0];
    if (!item) {
      throw new BillingCommandError("CHECKOUT_FAILED", 500);
    }
    if (subscriptionPriceId(entitled) === priceId && !entitled.cancel_at_period_end) {
      throw new BillingCommandError("ALREADY_SUBSCRIBED", 409);
    }
    await stripe.subscriptions.update(
      entitled.id,
      switchUpdateParams({
        itemId: item.id,
        priceId,
        userId: input.userId,
        plan: resolved.plan,
      }),
    );
  }

  return {
    url: `${appUrl}/account?billing=confirming&expect=${resolved.expect}`,
  };
}
