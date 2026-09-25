import type { User } from "@/db/schema";
import { entitlementPlan } from "@/lib/billing/plans";

export type PaidAccessUser = Pick<
  User,
  "role" | "subscriptionPlan" | "subscriptionStatus"
>;

export class ProAccessError extends Error {
  constructor(code = "PRO_REQUIRED") {
    super(code);
    this.name = "ProAccessError";
  }
}

export function hasActivePaidPlan(
  user:
    | Pick<User, "subscriptionPlan" | "subscriptionStatus">
    | null
    | undefined,
) {
  if (!user) return false;
  const plan = entitlementPlan({
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
  });
  return plan === "pro" || plan === "premium";
}

/**
 * Pro-tier capabilities: active Pro, active Premium, and admins.
 * Premium includes every Pro capability.
 */
export function hasProAccess(user: PaidAccessUser | null | undefined) {
  if (!user) return false;
  const plan = entitlementPlan(user);
  return plan === "pro" || plan === "premium";
}

export function isPaidDocumentFormat(format: string) {
  return format === "pdf" || format === "docx";
}
