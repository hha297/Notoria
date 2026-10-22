import type { UserRole } from "@/db/schema";

export const USER_ROLES = ["USER", "TESTER", "ADMIN"] as const satisfies readonly UserRole[];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "USER" || value === "TESTER" || value === "ADMIN";
}

/** Administrative dashboard and user-management permissions. */
export function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN";
}

export function isTesterRole(role: string | null | undefined) {
  return role === "TESTER";
}

/**
 * Full application feature access without a paid subscription.
 * Admins and testers both receive Premium-tier entitlements.
 * Testers do not receive administrative permissions.
 */
export function hasEntitlementOverride(role: string | null | undefined) {
  return role === "ADMIN" || role === "TESTER";
}

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  TESTER: 1,
  ADMIN: 2,
};

export function roleRank(role: string | null | undefined): number {
  if (!isUserRole(role)) return -1;
  return ROLE_RANK[role];
}
