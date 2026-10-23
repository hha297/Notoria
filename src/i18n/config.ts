export const locales = ["ar", "be", "bg", "bn", "bs", "cs", "da", "de", "el", "en", "es", "et", "fa", "fi", "fil", "fr", "hi", "hr", "hu", "hy", "id", "it", "ja", "ko", "lt", "lv", "ms", "nl", "no", "pl", "pt", "ro", "ru", "sk", "sl", "sq", "sr", "sv", "th", "tr", "uk", "ur", "vi", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export function isValidLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
