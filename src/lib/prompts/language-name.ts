import { getLanguageName } from "@/lib/languages";

/** Localized language name for the UI locale — never hard-codes a target language. */
export function getPromptLanguageName(code: string, locale: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    if (name) return name;
  } catch {
    // Fall through to the workspace catalogue name.
  }

  return getLanguageName(code);
}
