/**
 * Canonical Aihe (topic) and Käyttö (usage) IDs.
 *
 * Display labels live only in messages under `tags.topic.*` and `tags.grammar.*`.
 * Never store translated labels in the database — only these stable IDs.
 */

export const TOPIC_IDS = [
  "everyday_life",
  "home_housing",
  "food_drink",
  "travel",
  "transport_mobility",
  "work_working_life",
  "education_studying",
  "health_wellbeing",
  "services_shopping",
  "people_family_relationships",
  "feelings_opinions_experiences",
  "culture_leisure",
  "nature_environment",
  "society_community",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

/** Default topic for new writing/listening/speaking forms. */
export const DEFAULT_TOPIC_ID: TopicId = "everyday_life";

/**
 * Vocabulary Käyttö / Usage — register & style (not topic).
 * Writing/listening formality (formal/informal/neutral) remains separate.
 */
export const USAGE_IDS = [
  "formal",
  "informal",
  "spoken",
  "slang",
  "academic",
  "idiom",
] as const;

export type UsageId = (typeof USAGE_IDS)[number];

/** Usage ids kept for existing words but not offered in the picker. */
export const LEGACY_USAGE_IDS = ["grammar", "expression"] as const;

export type LegacyUsageId = (typeof LEGACY_USAGE_IDS)[number];

const TOPIC_ID_SET = new Set<string>(TOPIC_IDS);
const USAGE_ID_SET = new Set<string>(USAGE_IDS);
const LEGACY_USAGE_SET = new Set<string>(LEGACY_USAGE_IDS);

/**
 * Old short IDs, display labels, and near-synonyms → canonical topic id.
 * Keys must be lowercase trimmed.
 */
export const TOPIC_ID_ALIASES: Record<string, TopicId> = {
  // Previous short IDs
  daily: "everyday_life",
  home: "home_housing",
  food: "food_drink",
  travel: "travel",
  work: "work_working_life",
  school: "education_studying",
  health: "health_wellbeing",
  shopping: "services_shopping",
  people: "people_family_relationships",
  family: "people_family_relationships",
  feelings: "feelings_opinions_experiences",
  culture: "culture_leisure",
  nature: "nature_environment",
  business: "work_working_life",
  technology: "society_community",
  sports: "culture_leisure",

  // Finnish labels
  arki: "everyday_life",
  koti: "home_housing",
  "koti ja asuminen": "home_housing",
  ruoka: "food_drink",
  "ruoka ja juoma": "food_drink",
  matkailu: "travel",
  matkustaminen: "travel",
  liikenne: "transport_mobility",
  "liikenne ja liikkuminen": "transport_mobility",
  liikkuminen: "transport_mobility",
  työ: "work_working_life",
  "työ ja työelämä": "work_working_life",
  koulu: "education_studying",
  "koulutus ja opiskelu": "education_studying",
  opiskelu: "education_studying",
  terveys: "health_wellbeing",
  "terveys ja hyvinvointi": "health_wellbeing",
  ostokset: "services_shopping",
  "palvelut ja ostokset": "services_shopping",
  palvelut: "services_shopping",
  ihmiset: "people_family_relationships",
  "ihmiset ja ihmissuhteet": "people_family_relationships",
  "ihmiset, perhe ja ihmissuhteet": "people_family_relationships",
  perhe: "people_family_relationships",
  tunteet: "feelings_opinions_experiences",
  "tunteet ja kokemukset": "feelings_opinions_experiences",
  "tunteet, mielipiteet ja kokemukset": "feelings_opinions_experiences",
  kulttuuri: "culture_leisure",
  "kulttuuri ja vapaa-aika": "culture_leisure",
  "vapaa-aika": "culture_leisure",
  luonto: "nature_environment",
  "luonto ja ympäristö": "nature_environment",
  ympäristö: "nature_environment",
  yhteiskunta: "society_community",
  "yhteiskunta ja yhteisö": "society_community",
  yhteisö: "society_community",

  // English labels
  everyday: "everyday_life",
  "everyday life": "everyday_life",
  "daily life": "everyday_life",
  "home and housing": "home_housing",
  housing: "home_housing",
  "food and drink": "food_drink",
  travelling: "travel",
  traveling: "travel",
  transport: "transport_mobility",
  transportation: "transport_mobility",
  mobility: "transport_mobility",
  "transport and mobility": "transport_mobility",
  "getting around": "transport_mobility",
  "work and working life": "work_working_life",
  "working life": "work_working_life",
  education: "education_studying",
  studying: "education_studying",
  "education and studying": "education_studying",
  "health and well-being": "health_wellbeing",
  "health and wellbeing": "health_wellbeing",
  wellbeing: "health_wellbeing",
  "services and shopping": "services_shopping",
  services: "services_shopping",
  "people and relationships": "people_family_relationships",
  "people, family and relationships": "people_family_relationships",
  relationships: "people_family_relationships",
  "feelings and experiences": "feelings_opinions_experiences",
  "feelings, opinions and experiences": "feelings_opinions_experiences",
  opinions: "feelings_opinions_experiences",
  "culture and free time": "culture_leisure",
  "culture and leisure": "culture_leisure",
  "free time": "culture_leisure",
  leisure: "culture_leisure",
  "nature and the environment": "nature_environment",
  environment: "nature_environment",
  society: "society_community",
  community: "society_community",
  "society and community": "society_community",

  // Vietnamese labels
  "đời thường": "everyday_life",
  "nhà cửa": "home_housing",
  "nhà ở và sinh hoạt": "home_housing",
  "ăn uống": "food_drink",
  "du lịch": "travel",
  "đi lại và du lịch": "travel",
  "giao thông": "transport_mobility",
  "giao thông và di chuyển": "transport_mobility",
  "công việc": "work_working_life",
  "công việc và đời sống nghề nghiệp": "work_working_life",
  "trường học": "education_studying",
  "giáo dục và học tập": "education_studying",
  "sức khỏe": "health_wellbeing",
  "sức khỏe và hạnh phúc": "health_wellbeing",
  "mua sắm": "services_shopping",
  "dịch vụ và mua sắm": "services_shopping",
  "con người": "people_family_relationships",
  "con người và quan hệ": "people_family_relationships",
  "con người, gia đình và quan hệ": "people_family_relationships",
  "gia đình": "people_family_relationships",
  "cảm xúc": "feelings_opinions_experiences",
  "cảm xúc và trải nghiệm": "feelings_opinions_experiences",
  "cảm xúc, ý kiến và trải nghiệm": "feelings_opinions_experiences",
  "văn hóa": "culture_leisure",
  "văn hóa và giải trí": "culture_leisure",
  "thiên nhiên": "nature_environment",
  "thiên nhiên và môi trường": "nature_environment",
  "xã hội": "society_community",
  "xã hội và cộng đồng": "society_community",
};

export const USAGE_ID_ALIASES: Record<string, UsageId> = {
  muodollinen: "formal",
  epämuodollinen: "informal",
  puhekieli: "spoken",
  slangi: "slang",
  akateeminen: "academic",
  idiomi: "idiom",
  formal: "formal",
  informal: "informal",
  spoken: "spoken",
  colloquial: "spoken",
  "spoken / colloquial": "spoken",
  slang: "slang",
  academic: "academic",
  idiom: "idiom",
  idiomatic: "idiom",
  "trang trọng": "formal",
  "thân mật": "informal",
  "văn nói": "spoken",
  "tiếng lóng": "slang",
  "học thuật": "academic",
  "thành ngữ": "idiom",
};

/**
 * English glosses for AI tutor prompts only (not UI).
 * UI must use i18n `tags.topic.*`.
 */
export const TOPIC_PROMPT_LABELS: Record<TopicId, string> = {
  everyday_life: "everyday life",
  home_housing: "home and housing",
  food_drink: "food and drink",
  travel: "travelling",
  transport_mobility: "transport and getting around",
  work_working_life: "work and working life",
  education_studying: "education and studying",
  health_wellbeing: "health and well-being",
  services_shopping: "services and shopping",
  people_family_relationships: "people, family and relationships",
  feelings_opinions_experiences: "feelings, opinions and experiences",
  culture_leisure: "culture and free time",
  nature_environment: "nature and the environment",
  society_community: "society and community",
};

export function isTopicId(value: string): value is TopicId {
  return TOPIC_ID_SET.has(value);
}

export function isUsageId(value: string): value is UsageId {
  return USAGE_ID_SET.has(value);
}

export function isKnownTopicId(value: string): boolean {
  return TOPIC_ID_SET.has(value);
}

export function isKnownUsageId(value: string): boolean {
  return USAGE_ID_SET.has(value) || LEGACY_USAGE_SET.has(value);
}

/** next-intl key under the `tags` namespace for a topic id. */
export function topicMessageKey(id: string): `topic.${string}` {
  return `topic.${id}`;
}

/** next-intl key under the `tags` namespace for a usage id. */
export function usageMessageKey(id: string): `grammar.${string}` {
  return `grammar.${id}`;
}

/** Resolve a raw stored/display topic value to a canonical topic id. */
export function canonicalizeTopicId(raw: string): TopicId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isTopicId(trimmed)) return trimmed;
  return TOPIC_ID_ALIASES[trimmed.toLowerCase()] ?? null;
}

/** Resolve a raw stored/display usage value to a canonical usage id. */
export function canonicalizeUsageId(raw: string): UsageId | LegacyUsageId | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isKnownUsageId(trimmed)) {
    return trimmed as UsageId | LegacyUsageId;
  }
  return USAGE_ID_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function topicPromptLabel(topic: string | null | undefined): string {
  if (!topic?.trim()) return "everyday conversation";
  const id = canonicalizeTopicId(topic);
  if (id) return TOPIC_PROMPT_LABELS[id];
  return topic.trim();
}

/** Localized topic label via `tags` namespace translator (`tTags(topic.xxx)`). */
export function resolveTopicLabel(
  topic: string,
  translate: (key: string) => string,
): string {
  const id = canonicalizeTopicId(topic);
  if (id) return translate(topicMessageKey(id));
  return topic.trim();
}
