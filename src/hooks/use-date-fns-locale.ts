"use client";

import { useLocale } from "next-intl";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";

/** date-fns locale matching the active website UI language. */
export function useDateFnsLocale() {
  return dateFnsLocale(useLocale());
}
