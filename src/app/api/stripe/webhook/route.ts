import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { getStripeWebhookSecret, StripeConfigError } from "@/lib/stripe/config";
import {
  syncCheckoutSession,
  syncStripeInvoice,
  syncStripeSubscriptionObject,
} from "@/lib/stripe/subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature", code: "MISSING_SIGNATURE" },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      payload,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: "Billing is not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    console.error("Stripe webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid Stripe signature", code: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await syncCheckoutSession(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncStripeSubscriptionObject(event.data.object);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await syncStripeInvoice(event.data.object);
        break;
      default:
        break;
    }
  } catch {
    console.error("Stripe webhook handler failed", { type: event.type, id: event.id });
    return NextResponse.json(
      { error: "Webhook handler failed", code: "WEBHOOK_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
