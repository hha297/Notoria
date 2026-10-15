"use server";

import { getCurrentUserRecord } from "@/lib/auth/current-user";
import {
  getQuotaStatuses,
} from "@/lib/billing/entitlements";
import { entitlementPlan, type QuotaStatus } from "@/lib/billing/plans";

/** Current user's quota snapshot for client lock/refresh. */
export async function getMyQuotaStatuses(): Promise<QuotaStatus[]> {
  const user = await getCurrentUserRecord();
  if (!user) return [];
  return getQuotaStatuses(user.id, entitlementPlan(user));
}
