export type WorkplaceLanguage = {
  code: string;
  name: string;
  flagCode: string;
  /** Native-language preview shown under the language picker. */
  preview: string;
};

export const DEFAULT_WORKPLACE_LANGUAGE = "en";

export const WORKPLACE_LANGUAGES = [
  {
    code: "en",
    name: "English",
    flagCode: "GB",
    preview: "You'll study English in this workspace.",
  },
  {
    code: "fi",
    name: "Suomi",
    flagCode: "FI",
    preview: "Opiskelet suomea tässä työtilassa.",
  },
  {
    code: "sv",
    name: "Svenska",
    flagCode: "SE",
    preview: "Du studerar svenska i den här arbetsytan.",
  },
  {
    code: "vi",
    name: "Tiếng Việt",
    flagCode: "VN",
    preview: "Bạn sẽ học tiếng Việt ở không gian học này.",
  },
  {
    code: "de",
    name: "Deutsch",
    flagCode: "DE",
    preview: "Du lernst Deutsch in diesem Arbeitsbereich.",
  },
  {
    code: "fr",
    name: "Français",
    flagCode: "FR",
    preview: "Tu vas étudier le français dans cet espace de travail.",
  },
  {
    code: "es",
    name: "Español",
    flagCode: "ES",
    preview: "Estudiarás español en este espacio de trabajo.",
  },
  {
    code: "it",
    name: "Italiano",
    flagCode: "IT",
    preview: "Studierai l'italiano in questo spazio di lavoro.",
  },
  {
    code: "pt",
    name: "Português",
    flagCode: "PT",
    preview: "Você vai estudar português neste espaço de trabalho.",
  },
  {
    code: "nl",
    name: "Nederlands",
    flagCode: "NL",
    preview: "Je studeert Nederlands in deze werkruimte.",
  },
  {
    code: "no",
    name: "Norsk",
    flagCode: "NO",
    preview: "Du studerer norsk i dette arbeidsområdet.",
  },
  {
    code: "da",
    name: "Dansk",
    flagCode: "DK",
    preview: "Du studerer dansk i dette arbejdsområde.",
  },
  {
    code: "pl",
    name: "Polski",
    flagCode: "PL",
    preview: "Będziesz uczyć się polskiego w tej przestrzeni roboczej.",
  },
  {
    code: "ru",
    name: "Русский",
    flagCode: "RU",
    preview: "Вы будете изучать русский в этом рабочем пространстве.",
  },
  {
    code: "uk",
    name: "Українська",
    flagCode: "UA",
    preview: "Ви вивчатимете українську в цьому робочому просторі.",
  },
  {
    code: "ja",
    name: "日本語",
    flagCode: "JP",
    preview: "この学習スペースでは日本語を学びます。",
  },
  {
    code: "ko",
    name: "한국어",
    flagCode: "KR",
    preview: "이 학습 공간에서 한국어를 공부합니다.",
  },
  {
    code: "zh",
    name: "中文",
    flagCode: "CN",
    preview: "你将在此学习空间学习中文。",
  },
  {
    code: "ar",
    name: "العربية",
    flagCode: "SA",
    preview: "ستتعلم العربية في مساحة العمل هذه.",
  },
  {
    code: "hi",
    name: "हिन्दी",
    flagCode: "IN",
    preview: "आप इस कार्यस्थान में हिन्दी सीखेंगे।",
  },
  {
    code: "th",
    name: "ไทย",
    flagCode: "TH",
    preview: "คุณจะเรียนภาษาไทยในพื้นที่ทำงานนี้",
  },
  {
    code: "id",
    name: "Bahasa Indonesia",
    flagCode: "ID",
    preview: "Anda akan belajar Bahasa Indonesia di ruang kerja ini.",
  },
  {
    code: "tr",
    name: "Türkçe",
    flagCode: "TR",
    preview: "Bu çalışma alanında Türkçe öğreneceksiniz.",
  },
  {
    code: "el",
    name: "Ελληνικά",
    flagCode: "GR",
    preview: "Θα μελετήσετε ελληνικά σε αυτόν τον χώρο εργασίας.",
  },
  {
    code: "cs",
    name: "Čeština",
    flagCode: "CZ",
    preview: "V tomto pracovním prostoru se budete učit češtinu.",
  },
  {
    code: "hu",
    name: "Magyar",
    flagCode: "HU",
    preview: "Ebben a munkaterületben magyart fogsz tanulni.",
  },
  {
    code: "ro",
    name: "Română",
    flagCode: "RO",
    preview: "Vei învăța română în acest spațiu de lucru.",
  },
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

export function getLanguageStudyPreview(code: string): string {
  return (
    getLanguageByCode(code)?.preview ??
    "You'll study English in this workspace."
  );
}
