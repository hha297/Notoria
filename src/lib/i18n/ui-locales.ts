import { locales, type AppLocale } from "@/i18n/config";
import {
  LANGUAGE_REGION_ORDER,
  getLanguageByCode,
  type LanguageRegion,
} from "@/lib/languages";

/** Website UI locales that read right-to-left. */
export const RTL_LOCALES = ["ar", "ur", "fa"] as const;

export type RtlLocale = (typeof RTL_LOCALES)[number];

export function isRtlLocale(locale: string): locale is RtlLocale {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function localeTextDirection(locale: string): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export type UiLocaleMeta = {
  code: AppLocale;
  /** Native display name from the language registry. */
  label: string;
  /** English name for accessibility / AI prompts. */
  englishName: string;
  flag: string;
  region: LanguageRegion;
};

/**
 * UI locale metadata derived from the shared language registry.
 * Only enabled website UI locales (see `locales` in i18n/config).
 */
export function getUiLocaleMeta(locale: AppLocale): UiLocaleMeta {
  const language = getLanguageByCode(locale);
  return {
    code: locale,
    label: language?.name ?? locale,
    englishName: language?.englishName ?? locale,
    flag: language?.flagCode ?? "UN",
    region: language?.region ?? "europe",
  };
}

export function getAllUiLocaleMeta(): UiLocaleMeta[] {
  return locales.map(getUiLocaleMeta);
}

/** Popular UI locales used to seed the “Suggested” row when browser prefs are thin. */
const SUGGESTED_FALLBACK: AppLocale[] = [
  "en",
  "vi",
  "de",
  "fr",
  "es",
  "zh",
  "ja",
  "ko",
  "pt",
  "it",
  "pl",
  "ru",
  "uk",
  "tr",
  "ar",
  "hi",
  "id",
  "th",
  "fil",
  "ms",
];

const SUGGESTED_LIMIT = 6;

function normalizeBrowserLanguage(tag: string): AppLocale | null {
  const lower = tag.trim().toLowerCase().replaceAll("_", "-");
  if (!lower) return null;
  if (locales.includes(lower as AppLocale)) return lower as AppLocale;
  const base = lower.split("-")[0];
  if (base && locales.includes(base as AppLocale)) return base as AppLocale;
  // zh-CN / zh-TW → zh
  if (base === "zh" && locales.includes("zh")) return "zh";
  // fil / tl
  if ((base === "tl" || lower.startsWith("fil")) && locales.includes("fil")) {
    return "fil";
  }
  // nb / nn → no
  if ((base === "nb" || base === "nn") && locales.includes("no")) return "no";
  return null;
}

/**
 * Popular UI locales for the picker top row: current + browser prefs + fallbacks.
 * Deduped, capped, and only enabled website locales.
 */
export function getPopularUiLocales(
  current: AppLocale,
  browserLanguages: readonly string[] = typeof navigator !== "undefined"
    ? navigator.languages
    : [],
): UiLocaleMeta[] {
  const ordered: AppLocale[] = [current];

  for (const tag of browserLanguages) {
    const matched = normalizeBrowserLanguage(tag);
    if (matched && !ordered.includes(matched)) ordered.push(matched);
  }

  for (const code of SUGGESTED_FALLBACK) {
    if (locales.includes(code) && !ordered.includes(code)) ordered.push(code);
  }

  return ordered.slice(0, SUGGESTED_LIMIT).map(getUiLocaleMeta);
}

/** @deprecated Prefer flat grids; kept for workplace-adjacent callers/tests. */
export function groupUiLocalesByRegion(): Array<{
  region: LanguageRegion;
  locales: UiLocaleMeta[];
}> {
  const buckets = new Map<LanguageRegion, UiLocaleMeta[]>();
  for (const region of LANGUAGE_REGION_ORDER) {
    buckets.set(region, []);
  }

  for (const meta of getAllUiLocaleMeta()) {
    buckets.get(meta.region)?.push(meta);
  }

  return LANGUAGE_REGION_ORDER.map((region) => {
    const items = [...(buckets.get(region) ?? [])].sort((a, b) =>
      a.label.localeCompare(b.label, "en"),
    );
    return { region, locales: items };
  }).filter((group) => group.locales.length > 0);
}

/** English names for AI prompts keyed by enabled UI locale. */
export function uiLocaleEnglishName(locale: string): string {
  if (locales.includes(locale as AppLocale)) {
    return getUiLocaleMeta(locale as AppLocale).englishName;
  }
  return "English";
}
