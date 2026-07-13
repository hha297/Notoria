export type WorkplaceLanguage = {
  code: string;
  name: string;
  flagCode: string;
};

export const DEFAULT_WORKPLACE_LANGUAGE = "en";

export const WORKPLACE_LANGUAGES = [
  { code: "en", name: "English", flagCode: "GB" },
  { code: "fi", name: "Suomi", flagCode: "FI" },
  { code: "sv", name: "Svenska", flagCode: "SE" },
  { code: "vi", name: "Tiếng Việt", flagCode: "VN" },
  { code: "de", name: "Deutsch", flagCode: "DE" },
  { code: "fr", name: "Français", flagCode: "FR" },
  { code: "es", name: "Español", flagCode: "ES" },
  { code: "it", name: "Italiano", flagCode: "IT" },
  { code: "pt", name: "Português", flagCode: "PT" },
  { code: "nl", name: "Nederlands", flagCode: "NL" },
  { code: "no", name: "Norsk", flagCode: "NO" },
  { code: "da", name: "Dansk", flagCode: "DK" },
  { code: "pl", name: "Polski", flagCode: "PL" },
  { code: "ru", name: "Русский", flagCode: "RU" },
  { code: "uk", name: "Українська", flagCode: "UA" },
  { code: "ja", name: "日本語", flagCode: "JP" },
  { code: "ko", name: "한국어", flagCode: "KR" },
  { code: "zh", name: "中文", flagCode: "CN" },
  { code: "ar", name: "العربية", flagCode: "SA" },
  { code: "hi", name: "हिन्दी", flagCode: "IN" },
  { code: "th", name: "ไทย", flagCode: "TH" },
  { code: "id", name: "Bahasa Indonesia", flagCode: "ID" },
  { code: "tr", name: "Türkçe", flagCode: "TR" },
  { code: "el", name: "Ελληνικά", flagCode: "GR" },
  { code: "cs", name: "Čeština", flagCode: "CZ" },
  { code: "hu", name: "Magyar", flagCode: "HU" },
  { code: "ro", name: "Română", flagCode: "RO" },
] as const satisfies WorkplaceLanguage[];

export type WorkplaceLanguageCode = (typeof WORKPLACE_LANGUAGES)[number]["code"];

const languageCodes = new Set<string>(
  WORKPLACE_LANGUAGES.map((language) => language.code),
);

export function isValidLanguageCode(code: string): boolean {
  return languageCodes.has(code);
}

export function getLanguageByCode(code: string): WorkplaceLanguage | undefined {
  return WORKPLACE_LANGUAGES.find((language) => language.code === code);
}

export function getLanguageName(code: string): string {
  return getLanguageByCode(code)?.name ?? "English";
}
