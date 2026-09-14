import { cache } from "react";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";

export { hasProAccess, ProAccessError } from "@/lib/auth/paid-access";

export const getCurrentProAccess = cache(async () => {
  const user = await getCurrentUserRecord();
  if (!user) {
    return { hasProAccess: false };
  }

  return { hasProAccess: hasProAccess(user) };
});

export async function requireProAccess() {
  await getCurrentUserId();
  const user = await getCurrentUserRecord();

  if (!user || !hasProAccess(user)) {
    throw new ProAccessError();
  }

  return user;
}
