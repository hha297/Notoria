import type { User } from "@/db/schema";

const PRO_ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

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

  return (
    user.subscriptionPlan === "pro" &&
    Boolean(user.subscriptionStatus) &&
    PRO_ACCESS_STATUSES.has(user.subscriptionStatus as string)
  );
}

/** Pro subscribers and admins share the same paid-feature access. */
export function hasProAccess(user: PaidAccessUser | null | undefined) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return hasActivePaidPlan(user);
}

export function isPaidDocumentFormat(format: string) {
  return format === "pdf" || format === "docx";
}
