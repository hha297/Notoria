"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidLocale } from "@/i18n/config";
import { LOCALE_COOKIE } from "@/i18n/request";

export async function setAppLocale(locale: string) {
  if (!isValidLocale(locale)) {
    throw new Error("Invalid locale");
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
