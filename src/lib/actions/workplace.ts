"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isValidLanguageCode } from "@/lib/languages";
import { WORKPLACE_COOKIE } from "@/lib/workplace";

export async function setWorkplaceLanguage(code: string) {
  if (!isValidLanguageCode(code)) {
    throw new Error("Invalid language");
  }

  const cookieStore = await cookies();
  cookieStore.set(WORKPLACE_COOKIE, code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
