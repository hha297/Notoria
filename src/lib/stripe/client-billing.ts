export type CheckoutPlan = "pro" | "premium";
export type BillingExpect = "pro" | "premium" | "cancel" | "resume" | "schedule_pro";

export type StripeSessionResult = {
  ok: boolean;
  url?: string;
  code?: string;
};

export type SyncedSubscription = {
  ok: boolean;
  plan?: "free" | "pro" | "premium";
  cancelAtPeriodEnd?: boolean;
  scheduledPlan?: "free" | "pro" | "premium" | null;
  code?: string;
};

async function createStripeSession(
  path: string,
  body?: unknown,
): Promise<StripeSessionResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as {
    url?: string;
    code?: string;
  };

  return {
    ok: response.ok && Boolean(data.url),
    url: data.url,
    code: data.code,
  };
}

export function requestPlanChange(plan: CheckoutPlan | "free") {
  return createStripeSession("/api/stripe/create-checkout-session", {
    intent: "change",
    plan,
  });
}

export function requestResumePlan() {
  return createStripeSession("/api/stripe/create-checkout-session", {
    intent: "resume",
  });
}

export function createCheckoutSession(plan: CheckoutPlan = "pro") {
  return requestPlanChange(plan);
}

export function createPortalSession() {
  return createStripeSession("/api/stripe/create-portal-session");
}

export async function syncSubscription(): Promise<SyncedSubscription> {
  const response = await fetch("/api/stripe/sync-subscription", { method: "POST" });
  const data = (await response.json()) as {
    plan?: "free" | "pro" | "premium";
    cancelAtPeriodEnd?: boolean;
    scheduledPlan?: "free" | "pro" | "premium" | null;
    code?: string;
  };
  return {
    ok: response.ok && Boolean(data.plan),
    plan: data.plan,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    scheduledPlan: data.scheduledPlan ?? null,
    code: data.code,
  };
}

export function billingErrorKey(code?: string) {
  if (code === "ALREADY_PRO" || code === "ALREADY_SUBSCRIBED") {
    return "alreadySubscribed" as const;
  }
  if (code === "STRIPE_NOT_CONFIGURED") return "notConfigured" as const;
  if (code === "NO_STRIPE_CUSTOMER" || code === "NO_SUBSCRIPTION") {
    return "noCustomer" as const;
  }
  if (code === "PORTAL_FAILED") return "portalFailed" as const;
  if (code === "PAYMENT_FAILED") return "paymentFailed" as const;
  if (code === "PRICE_NOT_FOUND") return "priceMissing" as const;
  if (code === "PRICE_MODE_MISMATCH") return "priceModeMismatch" as const;
  if (code === "PRICE_INACTIVE") return "priceInactive" as const;
  if (code === "PRICE_CURRENCY") return "priceCurrency" as const;
  if (code === "PRICE_INTERVAL") return "priceInterval" as const;
  return "checkoutFailed" as const;
}
