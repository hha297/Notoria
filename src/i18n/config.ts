export const locales = ["en", "fi", "sv", "vi"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export function isValidLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
