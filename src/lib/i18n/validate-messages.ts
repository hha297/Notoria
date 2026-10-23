import { readFileSync } from "node:fs";
import { join } from "node:path";

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function leafKeys(value: JsonValue, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      leafKeys(item, prefix ? `${prefix}.${index}` : String(index)),
    );
  }
  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function valueType(value: JsonValue): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function getAtPath(root: JsonValue, path: string): JsonValue | undefined {
  const parts = path.split(".");
  let current: JsonValue | undefined = root;
  for (const part of parts) {
    if (current === undefined) return undefined;
    if (Array.isArray(current)) {
      current = current[Number(part)];
      continue;
    }
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

const ICU_TOKEN = /\{([a-zA-Z0-9_]+)(?:,|\})/g;

function icuVars(message: string): string[] {
  const vars = new Set<string>();
  for (const match of message.matchAll(ICU_TOKEN)) {
    if (match[1]) vars.add(match[1]);
  }
  return [...vars].sort();
}

export type MessageValidationResult = {
  locale: string;
  ok: boolean;
  missing: string[];
  extra: string[];
  typeMismatches: string[];
  icuMismatches: string[];
};

export function validateMessagesAgainstEnglish(
  locale: string,
  messagesRoot = join(process.cwd(), "messages"),
): MessageValidationResult {
  const english = JSON.parse(
    readFileSync(join(messagesRoot, "en.json"), "utf8"),
  ) as JsonObject;
  const target = JSON.parse(
    readFileSync(join(messagesRoot, `${locale}.json`), "utf8"),
  ) as JsonObject;

  const englishKeys = leafKeys(english);
  const targetKeySet = new Set(leafKeys(target));
  const missing = englishKeys.filter((key) => !targetKeySet.has(key));
  const extra = [...targetKeySet].filter((key) => !englishKeys.includes(key));

  const typeMismatches: string[] = [];
  const icuMismatches: string[] = [];

  for (const key of englishKeys) {
    if (!targetKeySet.has(key)) continue;
    const englishValue = getAtPath(english, key);
    const targetValue = getAtPath(target, key);
    if (englishValue === undefined || targetValue === undefined) continue;
    if (valueType(englishValue) !== valueType(targetValue)) {
      typeMismatches.push(key);
      continue;
    }
    if (typeof englishValue === "string" && typeof targetValue === "string") {
      const left = icuVars(englishValue).join(",");
      const right = icuVars(targetValue).join(",");
      if (left !== right) icuMismatches.push(key);
    }
  }

  return {
    locale,
    ok:
      missing.length === 0 &&
      extra.length === 0 &&
      typeMismatches.length === 0 &&
      icuMismatches.length === 0,
    missing,
    extra,
    typeMismatches,
    icuMismatches,
  };
}
