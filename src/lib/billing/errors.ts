import type { FeatureId, PlanId, QuotaFeatureId } from "@/lib/billing/plans";

export type QuotaExceededBody = {
  ok: false;
  code: "AI_QUOTA_EXCEEDED";
  feature: QuotaFeatureId;
  limit: number;
  used: number;
  remaining: 0;
  resetAt: string;
  upgradeRequired: true;
};

export type PremiumRequiredBody = {
  ok: false;
  code: "PREMIUM_REQUIRED";
  feature: FeatureId;
  currentPlan: PlanId;
  requiredPlan: "premium";
};

export type ProRequiredBody = {
  ok: false;
  code: "PRO_REQUIRED";
  feature: FeatureId;
  currentPlan: PlanId;
  requiredPlan: "pro";
};

export class QuotaExceededError extends Error {
  readonly code = "AI_QUOTA_EXCEEDED" as const;
  readonly body: QuotaExceededBody;

  constructor(body: Omit<QuotaExceededBody, "ok" | "code" | "remaining" | "upgradeRequired">) {
    super("AI_QUOTA_EXCEEDED");
    this.name = "QuotaExceededError";
    this.body = {
      ok: false,
      code: "AI_QUOTA_EXCEEDED",
      remaining: 0,
      upgradeRequired: true,
      ...body,
    };
  }
}

export class PremiumRequiredError extends Error {
  readonly code = "PREMIUM_REQUIRED" as const;
  readonly body: PremiumRequiredBody;

  constructor(feature: FeatureId, currentPlan: PlanId) {
    super("PREMIUM_REQUIRED");
    this.name = "PremiumRequiredError";
    this.body = {
      ok: false,
      code: "PREMIUM_REQUIRED",
      feature,
      currentPlan,
      requiredPlan: "premium",
    };
  }
}

export class ProRequiredError extends Error {
  readonly code = "PRO_REQUIRED" as const;
  readonly body: ProRequiredBody;

  constructor(feature: FeatureId, currentPlan: PlanId) {
    super("PRO_REQUIRED");
    this.name = "ProRequiredError";
    this.body = {
      ok: false,
      code: "PRO_REQUIRED",
      feature,
      currentPlan,
      requiredPlan: "pro",
    };
  }
}

export function isQuotaExceededError(error: unknown): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}
