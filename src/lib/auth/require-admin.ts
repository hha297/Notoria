import { cache } from "react";
import { AccountSuspendedError } from "@/lib/auth/errors";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { isAdminRole } from "@/lib/auth/roles";
import { getCurrentUserId } from "@/lib/auth/session";

export { AccountSuspendedError } from "@/lib/auth/errors";
export { isAdminRole } from "@/lib/auth/roles";

export class AdminAccessError extends Error {
  constructor(message = "ADMIN_REQUIRED") {
    super(message);
    this.name = "AdminAccessError";
  }
}

type AdminUser = {
  id: string;
  role: string;
  suspendedAt: Date | string | null;
};

/**
 * Admin permission from a fresh user row. A missing row, suspension, or a
 * non-admin role are denials. This does not accept a JWT role by itself.
 */
export function assertAdminUser<T extends AdminUser>(user: T | null | undefined): T {
  if (!user) {
    throw new AdminAccessError("Unauthorized");
  }
  if (user.suspendedAt) {
    throw new AccountSuspendedError();
  }
  if (!isAdminRole(user.role)) {
    throw new AdminAccessError();
  }
  return user;
}

/**
 * Active admin for the current session. Role and suspension always come from
 * the database, so demotions and suspensions apply on the next protected call.
 * If that read fails, the error stays a service failure and the session cookie
 * is left in place.
 */
export const requireAdmin = cache(async () => {
  await getCurrentUserId();
  const user = await getCurrentUserRecord();
  return assertAdminUser(user);
});
