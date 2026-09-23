import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import {
  billingFailureCode,
  billingFailureStatus,
  requestBillingChange,
} from "@/lib/stripe/commands";
import { parseBillingCommand } from "@/lib/stripe/lifecycle";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    let json: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      try {
        json = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: "Invalid plan", code: "INVALID_PLAN" },
          { status: 400 },
        );
      }
    }

    const parsed = parseBillingCommand(json);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Invalid plan", code: "INVALID_PLAN" },
        { status: 400 },
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
        stripeSubscriptionId: true,
      },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const result = await requestBillingChange({
      userId: user.id,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      command: parsed.command,
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    const code = billingFailureCode(error);
    if (code === "CHECKOUT_FAILED" || code === "PRICE_NOT_FOUND") {
      console.error("Stripe billing change failed", { code });
    }
    return NextResponse.json(
      { error: "Could not change subscription", code },
      { status: billingFailureStatus(error) },
    );
  }
}
