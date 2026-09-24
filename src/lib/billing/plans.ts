/**
 * Single source of truth for Notoria plans, quotas, and capabilities.
 * Stripe price IDs are not stored here — only the server config reads those.
 *
 * Daily quotas use UTC calendar dates. The project has no user timezone.
 *
 * Product positioning:
 * Free = limited AI tools
 * Pro = broad toolkit (expensive AI still metered; lightweight AI unlimited)
 * Premium = personalized learning intelligence (not merely higher quotas)
 */

export const PLAN_IDS = ["free", "pro", "premium"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PAID_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Metered AI actions. Limits are per plan via PLAN_DAILY_QUOTAS.
 * `null` means unlimited for ordinary use (still subject to rate/abuse limits).
 */
export const QUOTA_FEATURES = [
  "ai_meeting",
  "ai_listening_transcript",
  "ai_exercise",
  "ai_vocabulary",
  "ai_writing",
  "ai_learning_coach_chat",
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

/**
 * Daily quotas by plan. Source of truth for pricing UI and server enforcement.
 * - Speaking (`ai_meeting`): expensive realtime — capped Free/Pro; unlimited Premium
 * - Listening transcript: AssemblyAI duration-sensitive — capped Free/Pro; unlimited Premium
 * - Exercise / vocabulary / writing: lightweight — unlimited on paid plans
 * - Coach chat: Premium-only conversational intelligence
 */
export const PLAN_DAILY_QUOTAS: Record<
  PlanId,
  Record<QuotaFeatureId, number | null>
> = {
  free: {
    ai_meeting: 1,
    ai_listening_transcript: 1,
    ai_exercise: 3,
    ai_vocabulary: 5,
    ai_writing: 1,
    ai_learning_coach_chat: 0,
  },
  pro: {
    ai_meeting: 10,
    ai_listening_transcript: 10,
    ai_exercise: null,
    ai_vocabulary: null,
    ai_writing: null,
    ai_learning_coach_chat: 0,
  },
  premium: {
    ai_meeting: null,
    ai_listening_transcript: null,
    ai_exercise: null,
    ai_vocabulary: null,
    ai_writing: null,
    ai_learning_coach_chat: 100,
  },
};

/** @deprecated Prefer PLAN_DAILY_QUOTAS.free — kept for call sites that only need Free. */
export const FREE_DAILY_QUOTAS: Record<QuotaFeatureId, number> = {
  ai_meeting: PLAN_DAILY_QUOTAS.free.ai_meeting!,
  ai_listening_transcript: PLAN_DAILY_QUOTAS.free.ai_listening_transcript!,
  ai_exercise: PLAN_DAILY_QUOTAS.free.ai_exercise!,
  ai_vocabulary: PLAN_DAILY_QUOTAS.free.ai_vocabulary!,
  ai_writing: PLAN_DAILY_QUOTAS.free.ai_writing!,
  ai_learning_coach_chat: PLAN_DAILY_QUOTAS.free.ai_learning_coach_chat!,
};

/** Features shown on Free account “usage today” list. */
export const FREE_USAGE_QUOTA_FEATURES = QUOTA_FEATURES.filter(
  (feature) => feature !== "ai_learning_coach_chat",
);

/** Premium Coach chat daily budget (alias of PLAN_DAILY_QUOTAS.premium). */
export const PREMIUM_COACH_CHAT_DAILY =
  PLAN_DAILY_QUOTAS.premium.ai_learning_coach_chat!;

/**
 * Fair-use: one speaking “call” is one user-facing session, not every realtime
 * message. Cap duration so a single quota unit cannot run indefinitely.
 */
export const SPEAKING_MAX_SESSION_SECONDS = 30 * 60;

/**
 * Fair-use: one transcript quota unit covers one processing action up to this
 * audio length. Longer files are rejected before the provider call.
 */
export const LISTENING_MAX_TRANSCRIPT_SECONDS = 45 * 60;

export const PLAN_PRICES = {
  free: { monthlyCents: 0, currency: "EUR" },
  pro: { monthlyCents: 999, currency: "EUR" },
  premium: { monthlyCents: 1999, currency: "EUR" },
} as const;

/** Display-only first-month amount after 50% off (Stripe coupon does the real math). */
export const INTRO_OFFER_PERCENT_OFF = 50;

export function planIntroMonthlyCents(plan: "pro" | "premium") {
  return Math.floor(PLAN_PRICES[plan].monthlyCents / 2);
}

export function planIntroMonthlyPrice(plan: "pro" | "premium") {
  const price = PLAN_PRICES[plan];
  return formatMonthlyPrice(planIntroMonthlyCents(plan), price.currency);
}

/**
 * Lifetime eligibility for the first-month intro coupon.
 * Independent of current Free/Pro/Premium status — once used, never again.
 */
export function isIntroOfferEligible(user: {
  introOfferUsedAt?: Date | string | null;
} | null | undefined) {
  return !user?.introOfferUsedAt;
}

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

/** Next UTC midnight, when daily counters start over. */
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
      limit: PLAN_DAILY_QUOTAS[plan][feature],
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

/** True when this plan has at least one finite daily AI quota. */
export function planHasMeteredQuotas(plan: PlanId) {
  return QUOTA_FEATURES.some((feature) => {
    const limit = PLAN_DAILY_QUOTAS[plan][feature];
    return typeof limit === "number" && limit > 0;
  });
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
