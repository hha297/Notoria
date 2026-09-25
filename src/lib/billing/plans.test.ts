import { describe, expect, it } from "vitest";
import { UsageLedger } from "@/lib/billing/usage-ledger";
import {
  FREE_DAILY_QUOTAS,
  displayPlan,
  entitlementPlan,
  featureEnabled,
  getFeatureAccess,
  isIntroOfferEligible,
  planForStripePrice,
  planIntroMonthlyCents,
  planIntroMonthlyPrice,
  planMonthlyPrice,
  quotaResetAt,
  usageDateUtc,
} from "@/lib/billing/plans";

const env = {
  proPriceIds: ["price_pro"],
  premiumPriceId: "price_premium",
};

describe("plan resolution", () => {
  it("keeps an active unknown price on Pro", () => {
    expect(planForStripePrice("active", "price_legacy", env)).toBe("pro");
    expect(planForStripePrice("past_due", "price_pro", env)).toBe("pro");
  });

  it("maps the premium price only when the subscription still grants access", () => {
    expect(planForStripePrice("active", "price_premium", env)).toBe("premium");
    expect(planForStripePrice("trialing", "price_premium", env)).toBe("premium");
    expect(planForStripePrice("canceled", "price_premium", env)).toBe("free");
    expect(planForStripePrice("unpaid", "price_pro", env)).toBe("free");
    expect(planForStripePrice("incomplete_expired", "price_pro", env)).toBe("free");
  });

  it("uses the stored plan only while the Stripe status grants access", () => {
    expect(
      displayPlan({ subscriptionPlan: "pro", subscriptionStatus: "active" }),
    ).toBe("pro");
    expect(
      displayPlan({ subscriptionPlan: "premium", subscriptionStatus: "past_due" }),
    ).toBe("premium");
    expect(
      displayPlan({ subscriptionPlan: "pro", subscriptionStatus: "canceled" }),
    ).toBe("free");
    expect(entitlementPlan({ role: "ADMIN", subscriptionPlan: "free" })).toBe(
      "premium",
    );
  });
});

describe("entitlements", () => {
  it("gives Free the published daily quotas and no premium coach", () => {
    expect(getFeatureAccess("free", "ai_meeting")).toEqual({
      kind: "quota",
      limit: FREE_DAILY_QUOTAS.ai_meeting,
    });
    expect(getFeatureAccess("free", "ai_exercise").kind === "quota" &&
      getFeatureAccess("free", "ai_exercise")).toMatchObject({ limit: 3 });
    expect(getFeatureAccess("free", "ai_vocabulary")).toMatchObject({ limit: 5 });
    expect(getFeatureAccess("free", "ai_listening_transcript")).toMatchObject({
      limit: 1,
    });
    expect(getFeatureAccess("free", "ai_writing")).toEqual({
      kind: "quota",
      limit: FREE_DAILY_QUOTAS.ai_writing,
    });
    expect(featureEnabled("free", "ai_writing")).toBe(true);
    expect(featureEnabled("free", "pdf_export")).toBe(false);
    expect(featureEnabled("free", "listening")).toBe(false);
    expect(featureEnabled("free", "ai_learning_coach")).toBe(false);
  });

  it("meters expensive AI on Pro and keeps lightweight AI unlimited", () => {
    expect(getFeatureAccess("pro", "ai_meeting")).toEqual({
      kind: "quota",
      limit: 10,
    });
    expect(getFeatureAccess("pro", "ai_listening_transcript")).toEqual({
      kind: "quota",
      limit: 10,
    });
    for (const feature of ["ai_exercise", "ai_vocabulary", "ai_writing"] as const) {
      expect(getFeatureAccess("pro", feature)).toEqual({ kind: "quota", limit: null });
      expect(getFeatureAccess("premium", feature)).toEqual({
        kind: "quota",
        limit: null,
      });
    }
    expect(getFeatureAccess("premium", "ai_meeting")).toEqual({
      kind: "quota",
      limit: null,
    });
    expect(getFeatureAccess("premium", "ai_listening_transcript")).toEqual({
      kind: "quota",
      limit: null,
    });
    expect(getFeatureAccess("premium", "ai_learning_coach_chat")).toEqual({
      kind: "quota",
      limit: 100,
    });
    expect(getFeatureAccess("pro", "ai_learning_coach_chat")).toEqual({
      kind: "quota",
      limit: 0,
    });
    expect(featureEnabled("pro", "listening")).toBe(true);
    expect(featureEnabled("pro", "ai_learning_coach")).toBe(false);
    expect(featureEnabled("premium", "ai_learning_coach")).toBe(true);
    expect(featureEnabled("premium", "pdf_export")).toBe(true);
    expect(featureEnabled("premium", "adaptive_daily_practice")).toBe(true);
    expect(getFeatureAccess("free", "content_import")).toEqual({
      kind: "quota",
      limit: 0,
    });
    expect(getFeatureAccess("pro", "content_import")).toEqual({
      kind: "quota",
      limit: null,
    });
    expect(getFeatureAccess("premium", "content_import")).toEqual({
      kind: "quota",
      limit: null,
    });
    expect(getFeatureAccess("free", "ai_exercise_import")).toEqual({
      kind: "quota",
      limit: 0,
    });
    expect(getFeatureAccess("pro", "ai_exercise_import")).toEqual({
      kind: "quota",
      limit: 10,
    });
    expect(getFeatureAccess("premium", "ai_exercise_import")).toEqual({
      kind: "quota",
      limit: null,
    });
    expect(featureEnabled("free", "exercise_import")).toBe(false);
    expect(featureEnabled("pro", "exercise_import")).toBe(true);
  });
});

describe("usage dates", () => {
  it("resets on the UTC calendar day", () => {
    expect(usageDateUtc(new Date("2026-09-23T23:30:00.000Z"))).toBe("2026-09-23");
    expect(usageDateUtc(new Date("2026-09-24T00:00:00.000Z"))).toBe("2026-09-24");
    expect(quotaResetAt(new Date("2026-09-23T23:30:00.000Z"))).toBe(
      "2026-09-24T00:00:00.000Z",
    );
  });
});

describe("usage ledger", () => {
  it("blocks the next free meeting after one successful reservation", () => {
    const ledger = new UsageLedger();
    const first = ledger.reserve({
      userId: "u",
      feature: "ai_meeting",
      usageDate: "2026-09-23",
      limit: 1,
    });
    const second = ledger.reserve({
      userId: "u",
      feature: "ai_meeting",
      usageDate: "2026-09-23",
      limit: 1,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it("allows three exercise generations and blocks the fourth", () => {
    const ledger = new UsageLedger();
    const results = [0, 1, 2, 3].map(() =>
      ledger.reserve({
        userId: "u",
        feature: "ai_exercise",
        usageDate: "2026-09-23",
        limit: 3,
      }),
    );
    expect(results.slice(0, 3).every((result) => result.ok)).toBe(true);
    expect(results[3]?.ok).toBe(false);
  });

  it("allows five vocabulary actions and blocks the sixth", () => {
    const ledger = new UsageLedger();
    const results = Array.from({ length: 6 }, () =>
      ledger.reserve({
        userId: "u",
        feature: "ai_vocabulary",
        usageDate: "2026-09-23",
        limit: 5,
      }),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(5);
    expect(results[5]?.ok).toBe(false);
  });

  it("does not let two overlapping reservations share the last slot", async () => {
    const ledger = new UsageLedger();
    const [first, second] = await Promise.all([
      Promise.resolve().then(() =>
        ledger.reserve({
          userId: "u",
          feature: "ai_listening_transcript",
          usageDate: "2026-09-23",
          limit: 1,
        }),
      ),
      Promise.resolve().then(() =>
        ledger.reserve({
          userId: "u",
          feature: "ai_listening_transcript",
          usageDate: "2026-09-23",
          limit: 1,
        }),
      ),
    ]);
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
  });

  it("refunds a failed reservation once", () => {
    const ledger = new UsageLedger();
    const reserved = ledger.reserve({
      userId: "u",
      feature: "ai_meeting",
      usageDate: "2026-09-23",
      limit: 1,
    });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    expect(ledger.refund(reserved.reservationId)).toBe(true);
    expect(ledger.refund(reserved.reservationId)).toBe(false);
    expect(
      ledger.getCount("u", "ai_meeting", "2026-09-23"),
    ).toBe(0);
    expect(
      ledger.reserve({
        userId: "u",
        feature: "ai_meeting",
        usageDate: "2026-09-23",
        limit: 1,
      }).ok,
    ).toBe(true);
  });

  it("starts a new UTC day at zero", () => {
    const ledger = new UsageLedger();
    ledger.reserve({
      userId: "u",
      feature: "ai_meeting",
      usageDate: "2026-09-23",
      limit: 1,
    });
    expect(
      ledger.reserve({
        userId: "u",
        feature: "ai_meeting",
        usageDate: "2026-09-24",
        limit: 1,
      }).ok,
    ).toBe(true);
  });

  it("charges a shared subject only once", () => {
    const ledger = new UsageLedger();
    const first = ledger.reserve({
      userId: "u",
      feature: "ai_exercise",
      usageDate: "2026-09-23",
      limit: 3,
      subjectId: "import-1",
    });
    const second = ledger.reserve({
      userId: "u",
      feature: "ai_exercise",
      usageDate: "2026-09-23",
      limit: 3,
      subjectId: "import-1",
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.reused).toBe(true);
    }
    expect(ledger.getCount("u", "ai_exercise", "2026-09-23")).toBe(1);
  });
});

describe("introductory offer", () => {
  it("is eligible only when introOfferUsedAt is unset", () => {
    expect(isIntroOfferEligible(null)).toBe(true);
    expect(isIntroOfferEligible({})).toBe(true);
    expect(isIntroOfferEligible({ introOfferUsedAt: null })).toBe(true);
    expect(
      isIntroOfferEligible({ introOfferUsedAt: new Date("2026-01-01") }),
    ).toBe(false);
    expect(
      isIntroOfferEligible({ introOfferUsedAt: "2026-01-01T00:00:00.000Z" }),
    ).toBe(false);
  });

  it("does not regain eligibility when the user is currently Free", () => {
    // Current plan is irrelevant — only the lifetime timestamp matters.
    expect(
      isIntroOfferEligible({
        introOfferUsedAt: new Date("2026-03-01"),
      }),
    ).toBe(false);
  });

  it("shows half-price display amounts without changing the catalog price", () => {
    expect(planMonthlyPrice("pro")).toBe("€9.99");
    expect(planMonthlyPrice("premium")).toBe("€19.99");
    expect(planIntroMonthlyCents("pro")).toBe(499);
    expect(planIntroMonthlyCents("premium")).toBe(999);
    expect(planIntroMonthlyPrice("pro")).toBe("€4.99");
    expect(planIntroMonthlyPrice("premium")).toBe("€9.99");
  });
});
