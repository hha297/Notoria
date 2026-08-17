import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { getStripeClient } from "@/lib/stripe/client";
import {
  getAppBaseUrl,
  getStripePriceId,
  StripeConfigError,
} from "@/lib/stripe/config";
import { hasActiveProSubscription } from "@/lib/stripe/pro";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    if (hasActiveProSubscription(user)) {
      return NextResponse.json(
        { error: "Already subscribed", code: "ALREADY_PRO" },
        { status: 409 },
      );
    }

    const stripe = getStripeClient();
    const appUrl = getAppBaseUrl();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: getStripePriceId(),
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account?billing=success`,
      cancel_url: `${appUrl}/account?billing=canceled`,
      client_reference_id: user.id,
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Could not start checkout", code: "CHECKOUT_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: "Billing is not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("No such price")) {
      console.error("Failed to create Stripe checkout session: price not found");
    } else {
      console.error("Failed to create Stripe checkout session");
    }
    return NextResponse.json(
      { error: "Could not start checkout", code: "CHECKOUT_FAILED" },
      { status: 500 },
    );
  }
}
