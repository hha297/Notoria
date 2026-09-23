import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { users, type SubscriptionPlan } from "@/db/schema";
import {
  PAID_ACCESS_STATUSES,
  isPlanId,
  planForStripePrice,
  type PlanId,
} from "@/lib/billing/plans";
import { getStripeClient } from "@/lib/stripe/client";
import { isStripeConfigured, stripePriceEnv } from "@/lib/stripe/config";
import {
  shouldApplyIncomingSubscription,
  subscriptionRecordFromStripe,
} from "@/lib/stripe/lifecycle";

function asId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function planFromStripeStatus(
  status: string | null | undefined,
  priceId?: string | null,
): SubscriptionPlan {
  return planForStripePrice(status, priceId, stripePriceEnv());
}

export function subscriptionPriceId(subscription: Stripe.Subscription) {
  for (const item of subscription.items.data) {
    const price = item.price;
    if (price && typeof price === "object" && "id" in price && price.id) {
      return price.id;
    }
  }
  return null;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const fromSubscription =
    "current_period_end" in subscription &&
    typeof subscription.current_period_end === "number"
      ? subscription.current_period_end
      : null;

  const fromItem = subscription.items.data[0];
  const itemPeriodEnd =
    fromItem &&
    "current_period_end" in fromItem &&
    typeof fromItem.current_period_end === "number"
      ? fromItem.current_period_end
      : null;

  const unix = fromSubscription ?? itemPeriodEnd;
  if (!unix) return null;
  return new Date(unix * 1000);
}


function scheduleIdOf(subscription: Stripe.Subscription) {
  const schedule = subscription.schedule;
  if (!schedule) return null;
  return typeof schedule === "string" ? schedule : schedule.id;
}

function priceIdFromPhaseItem(
  item: Stripe.SubscriptionSchedule.Phase.Item | undefined,
) {
  if (!item?.price) return null;
  return typeof item.price === "string" ? item.price : item.price.id;
}

/**
 * Resolve a future paid plan from the subscription schedule or metadata.
 * Never invents a schedule — only reports what Stripe already has.
 */
export async function resolveScheduledPlan(input: {
  stripe: Stripe;
  subscription: Stripe.Subscription;
}): Promise<{ scheduledPlan: PlanId | null; scheduleId: string | null }> {
  const env = stripePriceEnv();
  const currentPriceId = subscriptionPriceId(input.subscription);
  const scheduleId = scheduleIdOf(input.subscription);
  const nowUnix = Math.floor(Date.now() / 1000);

  if (scheduleId) {
    try {
      const schedule = await input.stripe.subscriptionSchedules.retrieve(scheduleId);
      for (const phase of schedule.phases) {
        if (phase.start_date <= nowUnix) continue;
        const phasePriceId = priceIdFromPhaseItem(phase.items[0]);
        if (!phasePriceId || phasePriceId === currentPriceId) continue;
        const plan = planForStripePrice("active", phasePriceId, env);
        if (plan === "pro" || plan === "premium") {
          return { scheduledPlan: plan, scheduleId };
        }
      }
    } catch (error) {
      const missing =
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "resource_missing";
      if (!missing) throw error;
    }
  }

  const meta = input.subscription.metadata?.scheduledPlan;
  if (isPlanId(meta) && meta !== "free") {
    const currentPlan = planForStripePrice(
      input.subscription.status,
      currentPriceId,
      env,
    );
    if (meta !== currentPlan) {
      return { scheduledPlan: meta, scheduleId };
    }
  }

  return { scheduledPlan: null, scheduleId: null };
}

export async function findUserForStripeEvent(input: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (input.userId) {
    const byId = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (byId) return byId;
  }

  if (input.customerId) {
    const byCustomer = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, input.customerId),
    });
    if (byCustomer) return byCustomer;
  }

  if (input.subscriptionId) {
    const bySubscription = await db.query.users.findFirst({
      where: eq(users.stripeSubscriptionId, input.subscriptionId),
    });
    if (bySubscription) return bySubscription;
  }

  return null;
}

export async function syncUserSubscription(input: {
  userId?: string | null;
  customerId?: string | null;
  subscription: Stripe.Subscription;
}) {
  const customerId =
    input.customerId ?? asId(input.subscription.customer);
  const userId =
    input.userId ??
    input.subscription.metadata?.userId ??
    null;

  const user = await findUserForStripeEvent({
    userId,
    customerId,
    subscriptionId: input.subscription.id,
  });

  if (!user) {
    console.warn("Stripe subscription sync skipped: user not found", {
      eventUserId: userId,
      hasCustomer: Boolean(customerId),
      subscriptionId: input.subscription.id,
    });
    return null;
  }

  if (
    !shouldApplyIncomingSubscription({
      storedSubscriptionId: user.stripeSubscriptionId,
      storedStatus: user.subscriptionStatus,
      incomingId: input.subscription.id,
      incomingStatus: input.subscription.status,
    })
  ) {
    console.warn("Ignoring Stripe subscription that is not the current one", {
      storedSubscriptionId: user.stripeSubscriptionId,
      incomingSubscriptionId: input.subscription.id,
      incomingStatus: input.subscription.status,
    });
    return user.id;
  }

  const stripe = getStripeClient();
  const scheduled = await resolveScheduledPlan({
    stripe,
    subscription: input.subscription,
  });

  const record = subscriptionRecordFromStripe({
    status: input.subscription.status,
    priceId: subscriptionPriceId(input.subscription),
    cancelAtPeriodEnd: input.subscription.cancel_at_period_end,
    currentPeriodEnd: subscriptionPeriodEnd(input.subscription),
    customerId: customerId ?? user.stripeCustomerId,
    subscriptionId: input.subscription.id,
    scheduledPlan: scheduled.scheduledPlan,
    scheduleId: scheduled.scheduleId,
    env: stripePriceEnv(),
  });

  await db
    .update(users)
    .set({
      subscriptionPlan: record.subscriptionPlan,
      subscriptionStatus: record.subscriptionStatus,
      stripeCustomerId: record.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      stripeCurrentPeriodEnd: record.stripeCurrentPeriodEnd,
      stripeCancelAtPeriodEnd: record.stripeCancelAtPeriodEnd,
      scheduledSubscriptionPlan: record.scheduledSubscriptionPlan,
      stripeScheduleId: record.stripeScheduleId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return user.id;
}

export async function reconcileUserSubscription(userId: string) {
  if (!isStripeConfigured()) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!user) return null;

  const stripe = getStripeClient();
  let stored: Stripe.Subscription | null = null;

  if (user.stripeSubscriptionId) {
    try {
      stored = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (PAID_ACCESS_STATUSES.has(stored.status)) {
        return syncUserSubscription({
          userId: user.id,
          customerId: asId(stored.customer) ?? user.stripeCustomerId,
          subscription: stored,
        });
      }
    } catch (error) {
      const missing =
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "resource_missing";
      if (!missing) throw error;
    }
  }

  if (!user.stripeCustomerId) {
    return stored
      ? syncUserSubscription({
          userId: user.id,
          subscription: stored,
        })
      : null;
  }

  const listed = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 20,
  });
  const entitled = listed.data.filter((subscription) =>
    PAID_ACCESS_STATUSES.has(subscription.status),
  );
  const chosen = entitled[0] ?? stored ?? listed.data[0];
  if (!chosen) return null;

  return syncUserSubscription({
    userId: user.id,
    customerId: user.stripeCustomerId,
    subscription: chosen,
  });
}

export async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return null;
  }

  const userId = session.metadata?.userId ?? session.client_reference_id;
  const customerId = asId(session.customer);
  const subscriptionId = asId(session.subscription);

  if (!subscriptionId) {
    console.warn("Stripe checkout completed without subscription id");
    return null;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  return syncUserSubscription({
    userId,
    customerId,
    subscription,
  });
}

export async function syncStripeSubscriptionObject(
  subscription: Stripe.Subscription,
) {
  let current = subscription;
  try {
    current = await retrieveSubscription(subscription.id);
  } catch {
    current = subscription;
  }

  return syncUserSubscription({
    userId: current.metadata?.userId ?? subscription.metadata?.userId,
    customerId: asId(current.customer) ?? asId(subscription.customer),
    subscription: current,
  });
}

export async function syncStripeInvoice(invoice: Stripe.Invoice) {
  const customerId = asId(invoice.customer);
  const subscriptionId = asId(
    invoice.parent?.subscription_details?.subscription ?? null,
  );

  if (!subscriptionId) {
    return null;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  return syncUserSubscription({
    userId: subscription.metadata?.userId,
    customerId,
    subscription,
  });
}
