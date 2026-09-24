import type { ReactNode } from "react";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import "./call.css";
import { ProAccessProvider } from "@/components/billing/pro-access-provider";
import { displayPlan, isIntroOfferEligible } from "@/lib/billing/plans";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import {
  getStripePremiumFirstMonthCouponId,
  getStripeProFirstMonthCouponId,
} from "@/lib/stripe/config";
import { getCurrentSubscription } from "@/lib/stripe/pro";

function introOfferAvailable() {
  return Boolean(
    getStripeProFirstMonthCouponId() && getStripePremiumFirstMonthCouponId(),
  );
}

export default async function CallLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [proAccess, subscription] = await Promise.all([
    getCurrentProAccess(),
    getCurrentSubscription(),
  ]);

  return (
    <ProAccessProvider
      hasProAccess={proAccess.hasProAccess}
      plan={displayPlan(subscription)}
      cancelAtPeriodEnd={Boolean(
        subscription?.stripeCancelAtPeriodEnd && displayPlan(subscription) !== "free",
      )}
      currentPeriodEnd={subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null}
      introOfferEligible={
        isIntroOfferEligible(subscription ?? {}) && introOfferAvailable()
      }
    >
      <div className="speaking-call min-h-svh bg-surface-inverse text-on-inverse">
        {children}
      </div>
    </ProAccessProvider>
  );
}
