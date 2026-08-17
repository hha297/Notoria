export class StripeConfigError extends Error {
  constructor() {
    super("STRIPE_NOT_CONFIGURED");
    this.name = "StripeConfigError";
  }
}

export function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new StripeConfigError();
  }
  return secretKey;
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new StripeConfigError();
  }
  return priceId;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new StripeConfigError();
  }
  return secret;
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_PRICE_ID?.trim(),
  );
}

export function getAppBaseUrl() {
  const fromAuth = process.env.AUTH_URL?.trim();
  if (fromAuth) return fromAuth.replace(/\/$/, "");

  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, "");

  return "http://localhost:3000";
}
