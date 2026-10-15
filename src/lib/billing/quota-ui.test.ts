import { describe, expect, it } from "vitest";
import {
  isQuotaExhausted,
  isQuotaUnlimited,
  nextPlanThatIncreasesQuota,
  quotaProgressPercent,
  usageFeaturesForPlan,
} from "@/lib/billing/quota-ui";

describe("quota-ui", () => {
  it("detects exhausted and unlimited quotas", () => {
    expect(
      isQuotaExhausted({ limit: 1, used: 1, remaining: 0 }),
    ).toBe(true);
    expect(
      isQuotaExhausted({ limit: 10, used: 3, remaining: 7 }),
    ).toBe(false);
    expect(isQuotaUnlimited({ limit: null })).toBe(true);
    expect(isQuotaUnlimited({ limit: 5 })).toBe(false);
  });

  it("computes progress percent only for finite limits", () => {
    expect(quotaProgressPercent(1, 1)).toBe(100);
    expect(quotaProgressPercent(1, 4)).toBe(25);
    expect(quotaProgressPercent(0, null)).toBeNull();
  });

  it("suggests upgrade only when the next plan raises the allowance", () => {
    expect(nextPlanThatIncreasesQuota("free", "ai_meeting")).toBe("pro");
    expect(nextPlanThatIncreasesQuota("pro", "ai_meeting")).toBe("premium");
    expect(nextPlanThatIncreasesQuota("premium", "ai_meeting")).toBeNull();
    // Pro already unlimited for vocabulary — Premium does not increase it.
    expect(nextPlanThatIncreasesQuota("pro", "ai_vocabulary")).toBeNull();
  });

  it("lists usage features for each plan", () => {
    expect(usageFeaturesForPlan("free")).toContain("ai_meeting");
    expect(usageFeaturesForPlan("free")).not.toContain("content_import");
    expect(usageFeaturesForPlan("pro")).toContain("ai_vocabulary");
    expect(usageFeaturesForPlan("premium")).toContain("ai_learning_coach_chat");
  });
});
