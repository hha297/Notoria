"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { PlanId, QuotaFeatureId } from "@/lib/billing/plans";
import { useQuotaFeature } from "@/hooks/use-quota-feature";

const FEATURES_WITH_MESSAGES = [
  "ai_meeting",
  "ai_reading",
  "ai_listening_transcript",
  "ai_vocabulary",
  "ai_writing",
  "ai_exercise",
  "ai_exercise_import",
  "ai_learning_coach_chat",
  "content_import",
] as const satisfies readonly QuotaFeatureId[];

function planBucket(plan: PlanId): "free" | "pro" | "premium" {
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

export function useQuotaLockMessage(feature: QuotaFeatureId) {
  const tBilling = useTranslations("billing");
  const format = useFormatter();
  const gate = useQuotaFeature(feature);
  const locked = gate.exhausted && !gate.unlimited;

  const resetLabel = gate.resetAt
    ? format.dateTime(new Date(gate.resetAt), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : tBilling("quotaResetUtcMidnight");

  let message = tBilling("quotaExceededNoUpgrade", { reset: resetLabel });
  if (
    (FEATURES_WITH_MESSAGES as readonly string[]).includes(feature)
  ) {
    const bucket = planBucket(gate.plan);
    message = tBilling(
      `quotaMessages.${feature}.${bucket}` as "quotaMessages.ai_meeting.free",
      { reset: resetLabel },
    );
  }

  return {
    ...gate,
    locked,
    message,
  };
}
