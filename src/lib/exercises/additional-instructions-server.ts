import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { entitlementPlan } from "@/lib/billing/plans";
import { acceptedAdditionalInstructions } from "@/lib/exercises/additional-instructions";

export async function gateAdditionalInstructions(value: unknown) {
  const user = await getCurrentUserRecord();
  if (!user || user.suspendedAt) {
    return { ok: false as const, code: "AI_FORBIDDEN" as const };
  }
  const decision = acceptedAdditionalInstructions(entitlementPlan(user), value);
  if (!decision.ok) return decision;
  return { ok: true as const, text: decision.text };
}
