/**
 * Translate sitePages.landing in messages/*.json from English using OpenAI.
 * Usage: node scripts/translate-landing.mjs [--locales=fi,de] [--force]
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

function deepEqualKeys(a, b) {
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return true;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false;
    if (!deepEqualKeys(a[ak[i]], b[bk[i]])) return false;
  }
  return true;
}

function isStillEnglish(landing, enLanding) {
  return (
    landing?.hero?.headline === enLanding.hero.headline &&
    landing?.faq?.items?.what?.q === enLanding.faq.items.what.q
  );
}

async function chatJson(apiKey, messages, { retries = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
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

    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`HTTP ${res.status}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty response");
    if (data.choices?.[0]?.finish_reason === "length") {
      throw new Error("response truncated (length)");
    }
    return JSON.parse(content);
  }
  throw lastError || new Error("failed after retries");
}

async function translateObject(apiKey, locale, languageName, label, value) {
  const parsed = await chatJson(apiKey, [
    {
      role: "system",
      content: `You are a professional UI localization translator for Notoria, a private language-learning workspace.
Translate JSON string values from English to ${languageName} (${locale}).
Rules:
- Return ONLY a JSON object with the exact same keys and nesting as the input.
- Translate natural-language values only.
- Keep the brand name "Notoria" unchanged.
- Preserve placeholders like {name} exactly.
- Do not translate emails or URLs.
- Use natural, polished marketing tone for a premium education product.
- Output must be valid JSON.`,
    },
    {
      role: "user",
      content: `Translate this JSON (${label}) to ${languageName}. Return the translated JSON object only.\n\n${JSON.stringify(value)}`,
    },
  ]);

  if (!deepEqualKeys(parsed, value)) {
    throw new Error(`${locale}/${label}: key shape mismatch`);
  }
  return parsed;
}

async function translateLanding(apiKey, locale, enLanding) {
  const languageName = LOCALE_NAMES[locale] || locale;
  try {
    return await translateObject(apiKey, locale, languageName, "landing", enLanding);
  } catch (err) {
    console.warn(`  ${locale}: full translate failed (${err.message}); falling back to sections`);
    const translated = {};
    for (const sectionKey of Object.keys(enLanding)) {
      translated[sectionKey] = await translateObject(
        apiKey,
        locale,
        languageName,
        sectionKey,
        enLanding[sectionKey],
      );
    }
    if (!deepEqualKeys(translated, enLanding)) {
      throw new Error(`${locale}: section fallback key shape mismatch`);
    }
    return translated;
  }
}

async function translateLocale(apiKey, locale, enLanding, force) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const current = json.sitePages?.landing;
  if (!force && current && !isStillEnglish(current, enLanding)) {
    console.log(`skip ${locale} (already translated)`);
    return;
  }

  console.log(`translate ${locale}...`);
  const translated = await translateLanding(apiKey, locale, enLanding);
  json.sitePages = json.sitePages || {};
  json.sitePages.landing = translated;
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`wrote ${locale}`);
}

async function mapPool(items, concurrency, worker) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY missing");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const localesArg = args.find((a) => a.startsWith("--locales="));
  const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
  const enLanding = en.sitePages.landing;
  if (!enLanding) {
    console.error("en sitePages.landing missing");
    process.exit(1);
  }

  let targets = Object.keys(LOCALE_NAMES);
  if (localesArg) {
    targets = localesArg
      .slice("--locales=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  console.log(`Translating landing → ${targets.length} locales (force=${force})`);
  const failures = [];
  await mapPool(targets, 4, async (locale) => {
    try {
      await translateLocale(apiKey, locale, enLanding, force);
    } catch (err) {
      console.error(`FAIL ${locale}:`, err.message || err);
      failures.push(locale);
    }
  });

  if (failures.length) {
    console.error("Failed locales:", failures.join(", "));
    process.exit(1);
  }
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
