"use server";

import { cookies } from "next/headers";
import {
  REMEMBER_COOKIE,
  REMEMBER_PREFERENCE_MAX_AGE_SECONDS,
} from "@/lib/auth/policy";

/**
 * Short-lived httpOnly flag so Google's redirect can carry Remember me.
 * The session JWT is the source of truth after sign-in. This cookie is
 * cleared on the OAuth callback and on sign-out.
 */
export async function setRememberPreference(remember: boolean) {
  const jar = await cookies();
  jar.set(REMEMBER_COOKIE, remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REMEMBER_PREFERENCE_MAX_AGE_SECONDS,
  });
}
