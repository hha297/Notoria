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

/**
 * Active admin for the current session. Role/suspension always come from DB
 * so demotions and suspensions apply on the next protected server call.
 */
export const requireAdmin = cache(async () => {
  await getCurrentUserId();
  const user = await getCurrentUserRecord();

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
});
