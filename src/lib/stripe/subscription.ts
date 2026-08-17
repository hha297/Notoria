import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { users, type SubscriptionPlan } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";

const PRO_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

function asId(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function planFromStripeStatus(status: string | null | undefined): SubscriptionPlan {
  if (status && PRO_ACCESS_STATUSES.has(status)) {
    return "pro";
  }
  return "free";
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

  const status = input.subscription.status;
  const plan = planFromStripeStatus(status);

  await db
    .update(users)
    .set({
      subscriptionPlan: plan,
      subscriptionStatus: status,
      stripeCustomerId: customerId ?? user.stripeCustomerId,
      stripeSubscriptionId: input.subscription.id,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(input.subscription),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return user.id;
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
  return syncUserSubscription({
    userId: subscription.metadata?.userId,
    customerId: asId(subscription.customer),
    subscription,
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
