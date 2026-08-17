export type StripeSessionResult = {
  ok: boolean;
  url?: string;
  code?: string;
};

async function createStripeSession(path: string): Promise<StripeSessionResult> {
  const response = await fetch(path, { method: "POST" });
  const data = (await response.json()) as { url?: string; code?: string };

  return {
    ok: response.ok && Boolean(data.url),
    url: data.url,
    code: data.code,
  };
}

export function createCheckoutSession() {
  return createStripeSession("/api/stripe/create-checkout-session");
}

export function createPortalSession() {
  return createStripeSession("/api/stripe/create-portal-session");
}

export function billingErrorKey(code?: string) {
  if (code === "ALREADY_PRO") return "alreadyPro" as const;
  if (code === "STRIPE_NOT_CONFIGURED") return "notConfigured" as const;
  if (code === "NO_STRIPE_CUSTOMER") return "noCustomer" as const;
  if (code === "PORTAL_FAILED") return "portalFailed" as const;
  return "checkoutFailed" as const;
}
