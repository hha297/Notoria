import { cookies } from "next/headers";
import {
  DEFAULT_WORKPLACE_LANGUAGE,
  isValidLanguageCode,
} from "@/lib/languages";

export const WORKPLACE_COOKIE = "notoria-workplace";

export async function getWorkplaceLanguage(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(WORKPLACE_COOKIE)?.value;

  if (value && isValidLanguageCode(value)) {
    return value;
  }

  return DEFAULT_WORKPLACE_LANGUAGE;
}
