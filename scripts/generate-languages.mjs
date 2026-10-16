import { writeFileSync } from "fs";

function L(code, name, englishName, flagCode, preview, region, aliases = []) {
  return { code, name, englishName, flagCode, preview, region, aliases };
}

const study = (english) => `You'll study ${english} in this workspace.`;

/** Original 27 + curated national languages. Region follows flag country. */
const selectable = [
  // Original 27
  L("en", "English", "English", "GB", "You'll study English in this workspace.", "europe", ["EN"]),
  L("fi", "Suomi", "Finnish", "FI", "Opiskelet suomea tässä työtilassa.", "europe", ["Finnish"]),
  L("sv", "Svenska", "Swedish", "SE", "Du studerar svenska i den här arbetsytan.", "europe", ["Swedish"]),
  L("vi", "Tiếng Việt", "Vietnamese", "VN", "Bạn sẽ học tiếng Việt ở không gian học này.", "asia", ["Vietnamese"]),
  L("de", "Deutsch", "German", "DE", "Du lernst Deutsch in diesem Arbeitsbereich.", "europe", ["German"]),
  L("fr", "Français", "French", "FR", "Tu vas étudier le français dans cet espace de travail.", "europe", ["French"]),
  L("es", "Español", "Spanish", "ES", "Estudiarás español en este espacio de trabajo.", "europe", ["Spanish", "Castilian"]),
  L("it", "Italiano", "Italian", "IT", "Studierai l'italiano in questo spazio di lavoro.", "europe", ["Italian"]),
  L("pt", "Português", "Portuguese", "PT", "Você vai estudar português neste espaço de trabalho.", "europe", ["Portuguese"]),
  L("nl", "Nederlands", "Dutch", "NL", "Je studeert Nederlands in deze werkruimte.", "europe", ["Dutch", "Flemish"]),
  L("no", "Norsk", "Norwegian", "NO", "Du studerer norsk i dette arbeidsområdet.", "europe", ["Norwegian"]),
  L("da", "Dansk", "Danish", "DK", "Du studerer dansk i dette arbejdsområde.", "europe", ["Danish"]),
  L("pl", "Polski", "Polish", "PL", "Będziesz uczyć się polskiego w tej przestrzeni roboczej.", "europe", ["Polish"]),
  L("ru", "Русский", "Russian", "RU", "Вы будете изучать русский в этом рабочем пространстве.", "europe", ["Russian"]),
  L("uk", "Українська", "Ukrainian", "UA", "Ви вивчатимете українську в цьому робочому просторі.", "europe", ["Ukrainian"]),
  L("ja", "日本語", "Japanese", "JP", "この学習スペースでは日本語を学びます。", "asia", ["Japanese"]),
  L("ko", "한국어", "Korean", "KR", "이 학습 공간에서 한국어를 공부합니다.", "asia", ["Korean"]),
  L("zh", "中文", "Chinese", "CN", "你将在此学习空间学习中文。", "asia", ["Chinese", "Mandarin"]),
  L("ar", "العربية", "Arabic", "SA", "ستتعلم العربية في مساحة العمل هذه.", "asia", ["Arabic"]),
  L("hi", "हिन्दी", "Hindi", "IN", "आप इस कार्यस्थान में हिन्दी सीखेंगे।", "asia", ["Hindi"]),
  L("th", "ไทย", "Thai", "TH", "คุณจะเรียนภาษาไทยในพื้นที่ทำงานนี้", "asia", ["Thai"]),
  L("id", "Bahasa Indonesia", "Indonesian", "ID", "Anda akan belajar Bahasa Indonesia di ruang kerja ini.", "asia", ["Indonesian", "Bahasa"]),
  L("tr", "Türkçe", "Turkish", "TR", "Bu çalışma alanında Türkçe öğreneceksiniz.", "asia", ["Turkish"]),
  L("el", "Ελληνικά", "Greek", "GR", "Θα μελετήσετε ελληνικά σε αυτόν τον χώρο εργασίας.", "europe", ["Greek"]),
  L("cs", "Čeština", "Czech", "CZ", "V tomto pracovním prostoru se budete učit češtinu.", "europe", ["Czech"]),
  L("hu", "Magyar", "Hungarian", "HU", "Ebben a munkaterületben magyart fogsz tanulni.", "europe", ["Hungarian"]),
  L("ro", "Română", "Romanian", "RO", "Vei învăța română în acest spațiu de lucru.", "europe", ["Romanian"]),

  // Europe additions
  L("sq", "Shqip", "Albanian", "AL", study("Albanian"), "europe"),
  L("hy", "Հայերեն", "Armenian", "AM", study("Armenian"), "europe", ["Hayeren"]),
  L("be", "Беларуская", "Belarusian", "BY", study("Belarusian"), "europe"),
  L("bs", "Bosanski", "Bosnian", "BA", study("Bosnian"), "europe"),
  L("bg", "Български", "Bulgarian", "BG", study("Bulgarian"), "europe"),
  L("ca", "Català", "Catalan", "ES", study("Catalan"), "europe", ["Valencian"]),
  L("hr", "Hrvatski", "Croatian", "HR", study("Croatian"), "europe"),
  L("et", "Eesti", "Estonian", "EE", study("Estonian"), "europe"),
  L("ka", "ქართული", "Georgian", "GE", study("Georgian"), "europe"),
  L("is", "Íslenska", "Icelandic", "IS", study("Icelandic"), "europe"),
  L("ga", "Gaeilge", "Irish", "IE", study("Irish"), "europe", ["Irish Gaelic"]),
  L("lv", "Latviešu", "Latvian", "LV", study("Latvian"), "europe"),
  L("lt", "Lietuvių", "Lithuanian", "LT", study("Lithuanian"), "europe"),
  L("lb", "Lëtzebuergesch", "Luxembourgish", "LU", study("Luxembourgish"), "europe"),
  L("mk", "Македонски", "Macedonian", "MK", study("Macedonian"), "europe"),
  L("mt", "Malti", "Maltese", "MT", study("Maltese"), "europe"),
  L("cnr", "Crnogorski", "Montenegrin", "ME", study("Montenegrin"), "europe"),
  L("sr", "Српски", "Serbian", "RS", study("Serbian"), "europe"),
  L("sk", "Slovenčina", "Slovak", "SK", study("Slovak"), "europe"),
  L("sl", "Slovenščina", "Slovenian", "SI", study("Slovenian"), "europe", ["Slovene"]),

  // Asia additions
  L("az", "Azərbaycan", "Azerbaijani", "AZ", study("Azerbaijani"), "asia", ["Azeri"]),
  L("bn", "বাংলা", "Bengali", "BD", study("Bengali"), "asia", ["Bangla"]),
  L("my", "မြန်မာ", "Burmese", "MM", study("Burmese"), "asia", ["Myanmar"]),
  L("dv", "ދިވެހި", "Dhivehi", "MV", study("Dhivehi"), "asia", ["Maldivian", "Divehi"]),
  L("dz", "རྫོང་ཁ", "Dzongkha", "BT", study("Dzongkha"), "asia"),
  L("fil", "Filipino", "Filipino", "PH", study("Filipino"), "asia", ["Pilipino"]),
  L("he", "עברית", "Hebrew", "IL", study("Hebrew"), "asia", ["Ivrit"]),
  L("kk", "Қазақ", "Kazakh", "KZ", study("Kazakh"), "asia"),
  L("km", "ខ្មែរ", "Khmer", "KH", study("Khmer"), "asia", ["Cambodian"]),
  L("ky", "Кыргызча", "Kyrgyz", "KG", study("Kyrgyz"), "asia", ["Kirghiz"]),
  L("lo", "ລາວ", "Lao", "LA", study("Lao"), "asia", ["Laotian"]),
  L("ms", "Bahasa Melayu", "Malay", "MY", study("Malay"), "asia", ["Bahasa Malaysia"]),
  L("mn", "Монгол", "Mongolian", "MN", study("Mongolian"), "asia"),
  L("ne", "नेपाली", "Nepali", "NP", study("Nepali"), "asia"),
  L("ps", "پښتو", "Pashto", "AF", study("Pashto"), "asia", ["Pushto", "Pashtun"]),
  L("fa", "فارسی", "Persian", "IR", study("Persian"), "asia", ["Farsi"]),
  L("si", "සිංහල", "Sinhala", "LK", study("Sinhala"), "asia", ["Sinhalese"]),
  L("tg", "Тоҷикӣ", "Tajik", "TJ", study("Tajik"), "asia", ["Tajiki"]),
  L("ta", "தமிழ்", "Tamil", "IN", study("Tamil"), "asia"),
  L("tk", "Türkmen", "Turkmen", "TM", study("Turkmen"), "asia"),
  L("ur", "اردو", "Urdu", "PK", study("Urdu"), "asia"),
  L("uz", "Oʻzbek", "Uzbek", "UZ", study("Uzbek"), "asia"),

  // Africa additions
  L("aa", "Qafaraf", "Afar", "DJ", study("Afar"), "africa"),
  L("af", "Afrikaans", "Afrikaans", "ZA", study("Afrikaans"), "africa"),
  L("am", "አማርኛ", "Amharic", "ET", study("Amharic"), "africa"),
  L("bm", "Bamanankan", "Bambara", "ML", study("Bambara"), "africa", ["Bamanankan"]),
  L("ny", "Chichewa", "Chewa", "MW", study("Chewa"), "africa", ["Chichewa", "Nyanja"]),
  L("ha", "Hausa", "Hausa", "NG", study("Hausa"), "africa"),
  L("rw", "Ikinyarwanda", "Kinyarwanda", "RW", study("Kinyarwanda"), "africa", ["Rwanda"]),
  L("rn", "Ikirundi", "Kirundi", "BI", study("Kirundi"), "africa", ["Rundi"]),
  L("mg", "Malagasy", "Malagasy", "MG", study("Malagasy"), "africa"),
  L("om", "Afaan Oromoo", "Oromo", "ET", study("Oromo"), "africa"),
  L("sg", "Sängö", "Sango", "CF", study("Sango"), "africa"),
  L("nso", "Sesotho sa Leboa", "Northern Sotho", "ZA", study("Northern Sotho"), "africa", ["Sepedi", "Pedi"]),
  L("st", "Sesotho", "Southern Sotho", "LS", study("Southern Sotho"), "africa", ["Sesotho", "Sotho"]),
  L("sw", "Kiswahili", "Swahili", "TZ", study("Swahili"), "africa", ["Kiswahili"]),
  L("ti", "ትግርኛ", "Tigrinya", "ER", study("Tigrinya"), "africa"),
  L("tn", "Setswana", "Tswana", "BW", study("Tswana"), "africa", ["Setswana"]),
  L("xh", "isiXhosa", "Xhosa", "ZA", study("Xhosa"), "africa"),
  L("zu", "isiZulu", "Zulu", "ZA", study("Zulu"), "africa"),
  L("nd", "isiNdebele", "Northern Ndebele", "ZW", study("Northern Ndebele"), "africa", ["Ndebele"]),
  L("sn", "chiShona", "Shona", "ZW", study("Shona"), "africa"),
  L("so", "Soomaali", "Somali", "SO", study("Somali"), "africa"),
  L("crs", "Seselwa", "Seychellois Creole", "SC", study("Seychellois Creole"), "africa", ["Seselwa", "Kreol"]),
  L("zgh", "ⵜⴰⵎⴰⵣⵉⵖⵜ", "Tamazight", "MA", study("Tamazight"), "africa", ["Amazigh", "Berber"]),
  L("mos", "Mooré", "Mooré", "BF", study("Mooré"), "africa", ["Mossi", "Moore"]),

  // Americas additions
  L("ay", "Aymar aru", "Aymara", "BO", study("Aymara"), "americas"),
  L("gn", "Avañeʼẽ", "Guarani", "PY", study("Guarani"), "americas", ["Guaraní"]),
  L("qu", "Runa Simi", "Quechua", "PE", study("Quechua"), "americas", ["Kichwa", "Quichua"]),
  L("ht", "Kreyòl ayisyen", "Haitian Creole", "HT", study("Haitian Creole"), "americas", ["Haitian", "Kreyòl"]),

  // Oceania additions
  L("bi", "Bislama", "Bislama", "VU", study("Bislama"), "oceania"),
  L("fj", "Na Vosa Vakaviti", "Fijian", "FJ", study("Fijian"), "oceania"),
  L("ho", "Hiri Motu", "Hiri Motu", "PG", study("Hiri Motu"), "oceania", ["Police Motu"]),
  L("gil", "Taetae ni Kiribati", "Kiribati", "KI", study("Kiribati"), "oceania", ["Gilbertese"]),
  L("mi", "Te reo Māori", "Māori", "NZ", study("Māori"), "oceania", ["Maori"]),
  L("mh", "Kajin M̧ajeļ", "Marshallese", "MH", study("Marshallese"), "oceania"),
  L("na", "Dorerin Naoero", "Nauruan", "NR", study("Nauruan"), "oceania"),
  L("pau", "a tekoi er a Belau", "Palauan", "PW", study("Palauan"), "oceania"),
  L("sm", "Gagana Samoa", "Samoan", "WS", study("Samoan"), "oceania"),
  L("tet", "Tetun", "Tetum", "TL", study("Tetum"), "oceania", ["Tetun"]),
  L("tpi", "Tok Pisin", "Tok Pisin", "PG", study("Tok Pisin"), "oceania"),
  L("to", "lea faka-Tonga", "Tongan", "TO", study("Tongan"), "oceania"),
  L("tvl", "Te Ggana Tuuvalu", "Tuvaluan", "TV", study("Tuvaluan"), "oceania"),
];

/** Previously selectable languages removed from the curated catalogue. */
const legacy = [
  L("la", "Latina", "Latin", "VA", study("Latin"), "europe"),
  L("rm", "Rumantsch", "Romansh", "CH", study("Romansh"), "europe", ["Romansch"]),
  L("ku", "Kurdî", "Kurdish", "IQ", study("Kurdish"), "asia"),
  L("ff", "Fulfulde", "Fula", "SN", study("Fula"), "africa", ["Fulfulde", "Fulani", "Pulaar"]),
  L("mey", "Hassāniyya", "Hassaniya Arabic", "MR", study("Hassaniya Arabic"), "africa", ["Hassaniya", "Hassani"]),
  L("ss", "siSwati", "Swati", "SZ", study("Swati"), "africa", ["Swazi", "siSwati"]),
  L("ve", "Tshivenḓa", "Venda", "ZA", study("Venda"), "africa"),
  L("nr", "isiNdebele (South Africa)", "Southern Ndebele", "ZA", study("Southern Ndebele"), "africa", ["Ndebele (South Africa)", "isiNdebele"]),
  L("ts", "Xitsonga", "Tsonga", "ZA", study("Tsonga"), "africa", ["Shangani", "Shangaan"]),
  L("toi", "chitonga", "Tonga (Zimbabwe)", "ZW", study("Tonga (Zimbabwe)"), "africa", ["Zambezi Tonga", "chitonga"]),
  L("kck", "Kalanga", "Kalanga", "ZW", study("Kalanga"), "africa", ["TjiKalanga"]),
  L("nmq", "Nambya", "Nambya", "ZW", study("Nambya"), "africa"),
  L("ndc", "Ndau", "Ndau", "ZW", study("Ndau"), "africa", ["chiNdau"]),
  L("bwg", "Barwe", "Barwe", "ZW", study("Barwe"), "africa", ["Chibarwe"]),
  L("kao", "Xaasongaxango", "Kassonke", "ML", study("Kassonke"), "africa", ["Khassonké", "Xaasongaxango"]),
  L("man", "Maninka", "Maninka", "ML", study("Maninka"), "africa", ["Malinke", "Mandingo"]),
  L("myk", "Minyanka", "Minyanka", "ML", study("Minyanka"), "africa", ["Mamara"]),
  L("snk", "Soninke", "Soninke", "ML", study("Soninke"), "africa"),
  L("taq", "Tamasheq", "Tamasheq", "ML", study("Tamasheq"), "africa", ["Tuareg"]),
  L("bib", "Bissa", "Bissa", "BF", study("Bissa"), "africa"),
  L("dyu", "Julakan", "Dyula", "CI", study("Dyula"), "africa", ["Jula", "Dioula"]),
  L("hio", "Tshwa", "Tshwa", "BW", study("Tshwa"), "africa", ["Tsua"]),
  L("aro", "Araona", "Araona", "BO", study("Araona"), "americas"),
  L("brg", "Baure", "Baure", "BO", study("Baure"), "americas"),
  L("cax", "Bésiro", "Chiquitano", "BO", study("Chiquitano"), "americas", ["Bésiro", "Besiro"]),
  L("caz", "Canichana", "Canichana", "BO", study("Canichana"), "americas"),
  L("cav", "Cavineño", "Cavineño", "BO", study("Cavineño"), "americas"),
  L("cyb", "Cayubaba", "Cayubaba", "BO", study("Cayubaba"), "americas"),
  L("cao", "Chácobo", "Chácobo", "BO", study("Chácobo"), "americas"),
  L("cas", "Tsimané", "Tsimané", "BO", study("Tsimané"), "americas", ["Chimán", "Mosetén", "Chiman"]),
  L("ese", "Ese Ejja", "Ese Ejja", "BO", study("Ese Ejja"), "americas"),
  L("psm", "Guarasuʼwe", "Guarasuʼwe", "BO", study("Guarasu'we"), "americas", ["Pauserna", "Guarasu'we"]),
  L("gyr", "Guarayu", "Guarayu", "BO", study("Guarayu"), "americas"),
  L("ito", "Itonama", "Itonama", "BO", study("Itonama"), "americas"),
  L("lec", "Leco", "Leco", "BO", study("Leco"), "americas"),
  L("caw", "Kallawaya", "Kallawaya", "BO", study("Kallawaya"), "americas", ["Machajuyai-Kallawaya", "Callahuaya"]),
  L("mpu", "Machineri", "Machineri", "BO", study("Machineri"), "americas", ["Machinere"]),
  L("rey", "Maropa", "Maropa", "BO", study("Maropa"), "americas", ["Reyesano"]),
  L("ign", "Mojeño-Ignaciano", "Mojeño-Ignaciano", "BO", study("Mojeño-Ignaciano"), "americas", ["Ignaciano"]),
  L("trn", "Mojeño-Trinitario", "Mojeño-Trinitario", "BO", study("Mojeño-Trinitario"), "americas", ["Trinitario"]),
  L("ite", "Moré", "Moré", "BO", study("Moré"), "americas", ["Itene"]),
  L("mzp", "Movima", "Movima", "BO", study("Movima"), "americas"),
  L("pcw", "Pacawara", "Pacawara", "BO", study("Pacawara"), "americas", ["Pacahuara"]),
  L("puq", "Puquina", "Puquina", "BO", study("Puquina"), "americas"),
  L("srq", "Sirionó", "Sirionó", "BO", study("Sirionó"), "americas"),
  L("tna", "Tacana", "Tacana", "BO", study("Tacana"), "americas"),
  L("tpj", "Tapieté", "Tapieté", "BO", study("Tapieté"), "americas"),
  L("mtp", "Weenhayek", "Weenhayek", "BO", study("Weenhayek"), "americas", ["Wichí Lhamtés Nocten"]),
  L("yaa", "Yaminawa", "Yaminawa", "BO", study("Yaminawa"), "americas", ["Yaminahua"]),
  L("yuq", "Yuki", "Yuki", "BO", study("Yuki"), "americas", ["Yuqui"]),
  L("yuz", "Yuracaré", "Yuracaré", "BO", study("Yuracaré"), "americas"),
];

function assertUnique(list, label) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.code)) throw new Error(`Duplicate in ${label}: ${item.code}`);
    seen.add(item.code);
  }
}

assertUnique(selectable, "selectable");
assertUnique(legacy, "legacy");
for (const item of legacy) {
  if (selectable.some((s) => s.code === item.code)) {
    throw new Error(`Legacy overlaps selectable: ${item.code}`);
  }
}

console.log(
  JSON.stringify({
    selectable: selectable.length,
    legacy: legacy.length,
    byRegion: Object.fromEntries(
      ["europe", "asia", "africa", "americas", "oceania"].map((region) => [
        region,
        selectable.filter((l) => l.region === region).map((l) => l.code),
      ]),
    ),
  }),
);

function esc(value) {
  return JSON.stringify(value);
}

function emit(language) {
  const aliases = language.aliases?.length
    ? `,\n    aliases: [${language.aliases.map(esc).join(", ")}]`
    : "";
  return `  {
    code: ${esc(language.code)},
    name: ${esc(language.name)},
    englishName: ${esc(language.englishName)},
    flagCode: ${esc(language.flagCode)},
    preview: ${esc(language.preview)},
    region: ${esc(language.region)}${aliases},
  }`;
}

const header = `export type LanguageRegion =
  | "europe"
  | "asia"
  | "africa"
  | "americas"
  | "oceania";

export type WorkplaceLanguage = {
  code: string;
  /** Native or conventional display name shown in pickers. */
  name: string;
  /** English name used for search and accessibility. */
  englishName: string;
  flagCode: string;
  /** Native-language preview shown under the language picker. */
  preview: string;
  /** Navigation group for pickers — not stored on workspaces. */
  region: LanguageRegion;
  /** Extra search terms (aliases, alternate spellings). */
  aliases?: readonly string[];
};

export const DEFAULT_WORKPLACE_LANGUAGE = "en";

export const LANGUAGE_REGION_ORDER = [
  "europe",
  "asia",
  "africa",
  "americas",
  "oceania",
] as const satisfies readonly LanguageRegion[];

/** Languages offered in create / onboarding / shared pickers. */
export const WORKPLACE_LANGUAGES = [
`;

const mid = `
] as const satisfies readonly WorkplaceLanguage[];

/**
 * Languages removed from the selectable catalogue but still displayable for
 * existing workspaces that already stored these codes.
 */
export const LEGACY_WORKPLACE_LANGUAGES = [
`;

const footer = `
] as const satisfies readonly WorkplaceLanguage[];

export type WorkplaceLanguageCode = (typeof WORKPLACE_LANGUAGES)[number]["code"];

const selectableCodes = new Set<string>(
  WORKPLACE_LANGUAGES.map((language) => language.code),
);

const legacyCodes = new Set<string>(
  LEGACY_WORKPLACE_LANGUAGES.map((language) => language.code),
);

const allKnownLanguages: readonly WorkplaceLanguage[] = [
  ...WORKPLACE_LANGUAGES,
  ...LEGACY_WORKPLACE_LANGUAGES,
];

export function isSelectableLanguageCode(code: string): boolean {
  return selectableCodes.has(code);
}

export function isLegacyLanguageCode(code: string): boolean {
  return legacyCodes.has(code);
}

/** True for selectable or legacy codes (existing workspace data). */
export function isValidLanguageCode(code: string): boolean {
  return selectableCodes.has(code) || legacyCodes.has(code);
}

export function getLanguageByCode(code: string): WorkplaceLanguage | undefined {
  return allKnownLanguages.find((language) => language.code === code);
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

/** Options for pickers, optionally keeping a current legacy selection visible. */
export function getSelectableLanguages(options?: {
  includeCode?: string | null;
}): WorkplaceLanguage[] {
  const includeCode = options?.includeCode?.trim() || null;
  if (
    includeCode &&
    isLegacyLanguageCode(includeCode) &&
    !isSelectableLanguageCode(includeCode)
  ) {
    const legacy = getLanguageByCode(includeCode);
    return legacy ? [...WORKPLACE_LANGUAGES, legacy] : [...WORKPLACE_LANGUAGES];
  }
  return [...WORKPLACE_LANGUAGES];
}

export function normalizeLanguageSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function languageMatchesQuery(
  language: WorkplaceLanguage,
  query: string,
): boolean {
  const normalized = normalizeLanguageSearch(query);
  if (!normalized) return true;

  const haystack = [
    language.name,
    language.englishName,
    language.code,
    ...(language.aliases ?? []),
  ];

  return haystack.some((part) =>
    normalizeLanguageSearch(part).includes(normalized),
  );
}

export function filterLanguagesByQuery(
  languages: readonly WorkplaceLanguage[],
  query: string,
): WorkplaceLanguage[] {
  return languages.filter((language) => languageMatchesQuery(language, query));
}

function displaySortKey(language: WorkplaceLanguage): string {
  return normalizeLanguageSearch(language.name || language.englishName);
}

export function groupLanguagesByRegion(
  languages: readonly WorkplaceLanguage[],
): Array<{ region: LanguageRegion; languages: WorkplaceLanguage[] }> {
  const buckets = new Map<LanguageRegion, WorkplaceLanguage[]>();
  for (const region of LANGUAGE_REGION_ORDER) {
    buckets.set(region, []);
  }

  for (const language of languages) {
    const list = buckets.get(language.region);
    if (list) list.push(language);
  }

  return LANGUAGE_REGION_ORDER.map((region) => {
    const items = [...(buckets.get(region) ?? [])].sort((a, b) =>
      displaySortKey(a).localeCompare(displaySortKey(b)),
    );
    return { region, languages: items };
  }).filter((group) => group.languages.length > 0);
}
`;

writeFileSync(
  new URL("../src/lib/languages.ts", import.meta.url),
  header +
    selectable.map(emit).join(",\n") +
    mid +
    legacy.map(emit).join(",\n") +
    footer,
  "utf8",
);
console.log("wrote src/lib/languages.ts");
