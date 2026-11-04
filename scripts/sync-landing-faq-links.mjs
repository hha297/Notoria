/**
 * Sync FAQ rich-link answers + legal.backToHome into all locales.
 * Usage: node scripts/sync-landing-faq-links.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const messagesDir = path.join(root, "messages");

const LOCALE_NAMES = {
  ar: "Arabic",
  be: "Belarusian",
  bg: "Bulgarian",
  bn: "Bengali",
  bs: "Bosnian",
  ca: "Catalan",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fi: "Finnish",
  fil: "Filipino",
  fr: "French",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  hy: "Armenian",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  ms: "Malay",
  nl: "Dutch",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sq: "Albanian",
  sr: "Serbian",
  sv: "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  zh: "Simplified Chinese",
};

const LINKED_FAQ_KEYS = [
  "createAccount",
  "afterSignup",
  "plans",
  "help",
  "devices",
];

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function tagCounts(text) {
  const counts = Object.create(null);
  for (const match of text.matchAll(/<\/?([a-zA-Z]+)>/g)) {
    const key = match[0];
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function tagsMatch(en, translated) {
  const a = tagCounts(en);
  const b = tagCounts(translated);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] || 0) !== (b[key] || 0)) return false;
  }
  return true;
}

async function chatJson(apiKey, messages) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function translateBundle(apiKey, locale, languageName, bundle) {
  return chatJson(apiKey, [
    {
      role: "system",
      content: `You localize Notoria UI copy to ${languageName} (${locale}).
Return ONLY JSON with the same keys.
Preserve XML-like tags exactly (e.g. <signUp>...</signUp>, <support>...</support>) — translate only the text inside tags and surrounding text.
Keep brand "Notoria" and domain "notoria.fi" unchanged.`,
    },
    {
      role: "user",
      content: `Translate this JSON to ${languageName}:\n${JSON.stringify(bundle)}`,
    },
  ]);
}

async function mapPool(items, concurrency, worker) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
  const enFaqItems = en.sitePages.landing.faq.items;
  const enBundle = {
    backToHome: en.legal.backToHome,
    faq: Object.fromEntries(
      LINKED_FAQ_KEYS.map((key) => [key, { a: enFaqItems[key].a }]),
    ),
  };

  const args = process.argv.slice(2);
  const localesArg = args.find((a) => a.startsWith("--locales="));
  let locales = fs
    .readdirSync(messagesDir)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .map((f) => f.replace(/\.json$/, ""));
  if (localesArg) {
    locales = localesArg
      .slice("--locales=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const failures = [];
  await mapPool(locales, localesArg ? 1 : 4, async (locale) => {
    try {
      const filePath = path.join(messagesDir, `${locale}.json`);
      const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const languageName = LOCALE_NAMES[locale] || locale;
      console.log(`translate ${locale}...`);
      const translated = await translateBundle(
        apiKey,
        locale,
        languageName,
        enBundle,
      );

      if (!translated.backToHome || typeof translated.backToHome !== "string") {
        throw new Error("missing backToHome");
      }
      for (const key of LINKED_FAQ_KEYS) {
        const answer = translated.faq?.[key]?.a;
        if (!answer || !tagsMatch(enFaqItems[key].a, answer)) {
          throw new Error(`tag mismatch for ${key}`);
        }
        json.sitePages.landing.faq.items[key].a = answer;
      }
      json.legal = json.legal || {};
      json.legal.backToHome = translated.backToHome;
      fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
      console.log(`wrote ${locale}`);
    } catch (err) {
      console.error(`FAIL ${locale}:`, err.message || err);
      failures.push(locale);
    }
  });

  if (failures.length) {
    console.error("Failed:", failures.join(", "));
    process.exit(1);
  }
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
