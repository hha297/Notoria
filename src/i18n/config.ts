export const locales = ["ar", "be", "bg", "bs", "cs", "da", "de", "el", "en", "es", "fi", "fr", "hi", "hu", "hy", "id", "it", "ja", "ko", "nl", "no", "pl", "pt", "ro", "ru", "sq", "sv", "th", "tr", "uk", "vi", "zh"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export function isValidLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
