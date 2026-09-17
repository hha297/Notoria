/**
 * One-shot data migration: rewrite vocabulary_word_tags.tag values that are
 * old short ids or display labels to the current stable taxonomy ids.
 *
 * Safe to re-run. Does not drop custom:* tags. Dedupes (word_id, tag) after rewrite.
 *
 * Usage: node scripts/canonicalize-vocabulary-tags.mjs
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

/** Keep in sync with src/lib/taxonomy/topics.ts TOPIC_ID_ALIASES + USAGE_ID_ALIASES. */
const ALIASES = {
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
  arki: "everyday_life",
  koti: "home_housing",
  "koti ja asuminen": "home_housing",
  ruoka: "food_drink",
  "ruoka ja juoma": "food_drink",
  matkailu: "travel",
  matkustaminen: "travel",
  liikenne: "transport_mobility",
  "liikenne ja liikkuminen": "transport_mobility",
  työ: "work_working_life",
  "työ ja työelämä": "work_working_life",
  koulu: "education_studying",
  "koulutus ja opiskelu": "education_studying",
  terveys: "health_wellbeing",
  "terveys ja hyvinvointi": "health_wellbeing",
  ostokset: "services_shopping",
  "palvelut ja ostokset": "services_shopping",
  ihmiset: "people_family_relationships",
  perhe: "people_family_relationships",
  "ihmiset, perhe ja ihmissuhteet": "people_family_relationships",
  tunteet: "feelings_opinions_experiences",
  "tunteet, mielipiteet ja kokemukset": "feelings_opinions_experiences",
  kulttuuri: "culture_leisure",
  "kulttuuri ja vapaa-aika": "culture_leisure",
  luonto: "nature_environment",
  "luonto ja ympäristö": "nature_environment",
  yhteiskunta: "society_community",
  "yhteiskunta ja yhteisö": "society_community",
  "everyday life": "everyday_life",
  "home and housing": "home_housing",
  "food and drink": "food_drink",
  travelling: "travel",
  traveling: "travel",
  "transport and mobility": "transport_mobility",
  "work and working life": "work_working_life",
  "education and studying": "education_studying",
  "health and well-being": "health_wellbeing",
  "services and shopping": "services_shopping",
  "people, family and relationships": "people_family_relationships",
  "feelings, opinions and experiences": "feelings_opinions_experiences",
  "culture and free time": "culture_leisure",
  "nature and the environment": "nature_environment",
  "society and community": "society_community",
  muodollinen: "formal",
  epämuodollinen: "informal",
  puhekieli: "spoken",
  slangi: "slang",
  akateeminen: "academic",
  idiomi: "idiom",
  colloquial: "spoken",
  "spoken / colloquial": "spoken",
};

function canonicalize(tag) {
  if (typeof tag !== "string") return null;
  const trimmed = tag.trim();
  if (!trimmed || trimmed.startsWith("custom:")) return null;
  if (ALIASES[trimmed]) return ALIASES[trimmed];
  return ALIASES[trimmed.toLowerCase()] ?? null;
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(url, { prepare: false, max: 1 });

const rows = await sql`
  select id, word_id, tag
  from vocabulary_word_tags
`;

let updated = 0;

for (const row of rows) {
  const next = canonicalize(row.tag);
  if (!next || next === row.tag) continue;

  const existing = await sql`
    select id from vocabulary_word_tags
    where word_id = ${row.word_id} and tag = ${next} and id <> ${row.id}
    limit 1
  `;
  if (existing.length > 0) {
    await sql`delete from vocabulary_word_tags where id = ${row.id}`;
  } else {
    await sql`
      update vocabulary_word_tags
      set tag = ${next}
      where id = ${row.id}
    `;
  }
  updated += 1;
  console.log(`${row.tag} → ${next}`);
}

await sql.end();
console.log(`\nDone. Updated or removed ${updated} tag row(s).`);
