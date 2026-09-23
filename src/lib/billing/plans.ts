/**
 * Single source of truth for Notoria plans, quotas, and capabilities.
 * Stripe price IDs are not stored here — only the server config reads those.
 *
 * Daily quotas use UTC calendar dates. The project has no user timezone.
 */

export const PLAN_IDS = ["free", "pro", "premium"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PAID_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Metered AI actions. Free has a daily cap; Pro and Premium are unlimited. */
export const QUOTA_FEATURES = [
  "ai_meeting",
  "ai_listening_transcript",
  "ai_exercise",
  "ai_vocabulary",
  "ai_writing",
] as const;
export type QuotaFeatureId = (typeof QUOTA_FEATURES)[number];

/**
 * Boolean capabilities. A future plan can mix these without new conditionals
 * at each call site.
 */
export const CAPABILITY_FEATURES = [
  "pdf_export",
  "listening",
  "ai_speaking_tutor",
  "exercise_import",
  "ai_learning_coach",
  "adaptive_daily_practice",
  "weekly_learning_review",
  "practice_from_mistakes",
  "personal_learning_profile",
  "personal_learning_path",
  "cross_module_ai",
] as const;
export type CapabilityFeatureId = (typeof CAPABILITY_FEATURES)[number];

export type FeatureId = QuotaFeatureId | CapabilityFeatureId;

export const FREE_DAILY_QUOTAS: Record<QuotaFeatureId, number> = {
  ai_meeting: 1,
  ai_listening_transcript: 1,
  ai_exercise: 3,
  ai_vocabulary: 5,
  ai_writing: 1,
};

export const PLAN_PRICES = {
  free: { monthlyCents: 0, currency: "EUR" },
  pro: { monthlyCents: 999, currency: "EUR" },
  premium: { monthlyCents: 1999, currency: "EUR" },
} as const;

/**
 * Premium capabilities that have a working surface today.
 * Scaffolded entitlements stay in the plan config but are not advertised.
 */
/**
 * Premium capabilities with a working Coach surface.
 * Scaffolded-only entitlements stay in CAPABILITY_FEATURES but stay out of marketing.
 */
export const VISIBLE_PREMIUM_FEATURES = [
  "ai_learning_coach",
  "personal_learning_profile",
  "adaptive_daily_practice",
  "weekly_learning_review",
  "practice_from_mistakes",
  "personal_learning_path",
  "cross_module_ai",
] as const satisfies readonly CapabilityFeatureId[];

export type FeatureAccess =
  | { kind: "quota"; limit: number | null }
  | { kind: "flag"; enabled: boolean };

export type QuotaStatus = {
  feature: QuotaFeatureId;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string;
};

type PlanUser = {
  role?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
} | null | undefined;

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "free" || value === "pro" || value === "premium";
}

export function isQuotaFeature(feature: FeatureId): feature is QuotaFeatureId {
  return (QUOTA_FEATURES as readonly string[]).includes(feature);
}

export function usageDateUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Next UTC midnight, when Free daily counters start over. */
export function quotaResetAt(now = new Date()) {
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  return reset.toISOString();
}

export function formatMonthlyPrice(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function planMonthlyPrice(plan: PlanId) {
  const price = PLAN_PRICES[plan];
  return formatMonthlyPrice(price.monthlyCents, price.currency);
}

export function planRank(plan: PlanId) {
  if (plan === "premium") return 2;
  if (plan === "pro") return 1;
  return 0;
}

/**
 * Paid plan stored on the user, ignoring admin override.
 * Unknown or inactive statuses are Free, including canceled, unpaid,
 * incomplete, and incomplete_expired.
 */
export function displayPlan(user: PlanUser): PlanId {
  if (!user?.subscriptionStatus || !PAID_ACCESS_STATUSES.has(user.subscriptionStatus)) {
    return "free";
  }
  if (user.subscriptionPlan === "premium") return "premium";
  if (user.subscriptionPlan === "pro") return "pro";
  return "free";
}

/** Admins receive Premium capabilities without a Stripe subscription. */
export function entitlementPlan(user: PlanUser): PlanId {
  if (user?.role === "ADMIN") return "premium";
  return displayPlan(user);
}

export function hasPaidPlan(user: PlanUser) {
  const plan = displayPlan(user);
  return plan === "pro" || plan === "premium";
}

export function getFeatureAccess(plan: PlanId, feature: FeatureId): FeatureAccess {
  if (isQuotaFeature(feature)) {
    return {
      kind: "quota",
      limit: plan === "free" ? FREE_DAILY_QUOTAS[feature] : null,
    };
  }

  const pro = plan === "pro" || plan === "premium";
  const premium = plan === "premium";

  switch (feature) {
    case "pdf_export":
    case "listening":
      return { kind: "flag", enabled: pro };
    case "ai_speaking_tutor":
    case "exercise_import":
      // Open to Free. Meetings and exercise generation are metered separately.
      return { kind: "flag", enabled: true };
    case "ai_learning_coach":
    case "adaptive_daily_practice":
    case "weekly_learning_review":
    case "practice_from_mistakes":
    case "personal_learning_profile":
    case "personal_learning_path":
    case "cross_module_ai":
      return { kind: "flag", enabled: premium };
    default: {
      const unreachable: never = feature;
      return unreachable;
    }
  }
}

export function featureEnabled(plan: PlanId, feature: FeatureId) {
  const access = getFeatureAccess(plan, feature);
  if (access.kind === "quota") return true;
  return access.enabled;
}

export type StripePriceEnv = {
  proPriceIds: string[];
  premiumPriceId: string | null;
};

/**
 * Active subscriptions with an unrecognized price stay Pro.
 * That preserves existing Pro customers if their price id predates Premium.
 * Premium is assigned only when the subscription item matches the Premium price.
 */
export function planForStripePrice(
  status: string | null | undefined,
  priceId: string | null | undefined,
  env: StripePriceEnv,
): PlanId {
  if (!status || !PAID_ACCESS_STATUSES.has(status)) return "free";
  if (priceId && env.premiumPriceId && priceId === env.premiumPriceId) {
    return "premium";
  }
  return "pro";
}
