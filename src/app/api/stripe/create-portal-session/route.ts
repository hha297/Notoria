import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { getStripeClient } from "@/lib/stripe/client";
import { getAppBaseUrl, StripeConfigError } from "@/lib/stripe/config";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing customer", code: "NO_STRIPE_CUSTOMER" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 1,
      active: true,
    });
    const configuration =
      configurations.data[0] ??
      (await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: "Notoria Pro",
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true },
        },
      }));

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppBaseUrl()}/account`,
      configuration: configuration.id,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: "Billing is not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    console.error("Failed to create Stripe portal session");
    return NextResponse.json(
      { error: "Could not open billing portal", code: "PORTAL_FAILED" },
      { status: 500 },
    );
  }
}
