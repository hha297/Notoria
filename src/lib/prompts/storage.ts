import { isOnboardingTakingPriority } from "@/lib/onboarding/storage";

const LAST_PROMPT_KEY = "notoria.welcome-prompt.last";
const RECENT_PROMPTS_KEY = "notoria.welcome-prompt.recent";
const SESSION_SHOWN_KEY = "notoria.welcome-modal.shown";
const LAST_SHOWN_AT_KEY = "notoria.welcome-modal.lastShownAt";
const LAST_HIDDEN_AT_KEY = "notoria.welcome-modal.lastHiddenAt";
const FORCE_SHOW_KEY = "notoria.welcome-modal.force";

const RECENT_LIMIT = 8;
/** Re-show after login/re-entry, but not within this window. */
export const WELCOME_MODAL_COOLDOWN_MS = 4 * 60 * 60 * 1000;

function read(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode / blocked storage — skip persistence.
  }
}

function remove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readLastPromptId(): string | null {
  if (typeof window === "undefined") return null;
  return read(localStorage, LAST_PROMPT_KEY);
}

export function readRecentPromptIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = read(localStorage, RECENT_PROMPTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function persistPromptId(id: string) {
  if (typeof window === "undefined") return;
  write(localStorage, LAST_PROMPT_KEY, id);

  const recent = readRecentPromptIds().filter((item) => item !== id);
  recent.unshift(id);
  write(
    localStorage,
    RECENT_PROMPTS_KEY,
    JSON.stringify(recent.slice(0, RECENT_LIMIT)),
  );
}

/** Call after a successful sign-in so the welcome modal appears. */
export function requestWelcomeModalOnLogin() {
  if (typeof window === "undefined") return;
  write(sessionStorage, FORCE_SHOW_KEY, "1");
  remove(sessionStorage, SESSION_SHOWN_KEY);
}

export function markWelcomeModalShown() {
  if (typeof window === "undefined") return;
  write(sessionStorage, SESSION_SHOWN_KEY, "1");
  write(localStorage, LAST_SHOWN_AT_KEY, String(Date.now()));
  remove(sessionStorage, LAST_HIDDEN_AT_KEY);
  remove(sessionStorage, FORCE_SHOW_KEY);
}

export function markWelcomeModalHidden() {
  if (typeof window === "undefined") return;
  write(sessionStorage, LAST_HIDDEN_AT_KEY, String(Date.now()));
}

export function shouldShowWelcomeModal(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;

  if (isOnboardingTakingPriority()) return false;

  const forced = read(sessionStorage, FORCE_SHOW_KEY) === "1";
  if (forced) return true;

  const lastShown = Number(read(localStorage, LAST_SHOWN_AT_KEY) ?? 0);
  const cooledDown = !lastShown || now - lastShown >= WELCOME_MODAL_COOLDOWN_MS;
  if (!cooledDown) return false;

  const shownThisSession = read(sessionStorage, SESSION_SHOWN_KEY) === "1";
  if (!shownThisSession) return true;

  const lastHidden = Number(read(sessionStorage, LAST_HIDDEN_AT_KEY) ?? 0);
  return Boolean(lastHidden && now - lastHidden >= WELCOME_MODAL_COOLDOWN_MS);
}
