import { cache } from "react";
import { auth } from "@/auth";

export const getSession = cache(async () => auth());

export const getCurrentUserId = cache(async (): Promise<string> => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user.id;
});

export async function requireUser() {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}
