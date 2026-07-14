import { getLanguageName } from "@/lib/languages";

const ADJECTIVES = [
  "Blue",
  "Silent",
  "Morning",
  "Golden",
  "Hidden",
  "Bright",
  "Calm",
  "Wild",
  "Gentle",
  "Cosmic",
];

const NOUNS = [
  "Forest",
  "Lake",
  "Owl",
  "Harbor",
  "Garden",
  "Summit",
  "River",
  "Studio",
  "Atlas",
  "Horizon",
];

export function generateWorkspaceName(languageCode: string): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}

export function resolveWorkspaceName(
  name: string | undefined,
  languageCode: string,
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (Math.random() < 0.5) {
    return `My ${getLanguageName(languageCode)}`;
  }

  return generateWorkspaceName(languageCode);
}
