import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { displayPlan } from "@/lib/billing/plans";
import { StripeConfigError } from "@/lib/stripe/config";
import { reconcileUserSubscription } from "@/lib/stripe/subscription";

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

    await reconcileUserSubscription(session.user.id);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCurrentPeriodEnd: true,
        stripeCancelAtPeriodEnd: true,
        scheduledSubscriptionPlan: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const plan = displayPlan(user);
    const scheduled =
      plan !== "free" &&
      user.scheduledSubscriptionPlan &&
      user.scheduledSubscriptionPlan !== "free" &&
      user.scheduledSubscriptionPlan !== plan
        ? user.scheduledSubscriptionPlan
        : null;

    return NextResponse.json({
      plan,
      status: user.subscriptionStatus,
      cancelAtPeriodEnd: user.stripeCancelAtPeriodEnd && !scheduled,
      scheduledPlan: scheduled,
      currentPeriodEnd: user.stripeCurrentPeriodEnd?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: "Billing is not configured", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    console.error("Stripe subscription sync failed");
    return NextResponse.json(
      { error: "Could not confirm subscription", code: "SYNC_FAILED" },
      { status: 500 },
    );
  }
}
