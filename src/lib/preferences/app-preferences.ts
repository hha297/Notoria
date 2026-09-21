const REDUCE_MOTION_KEY = "notoria.preferences.reduceMotion";

export type ReduceMotionPreference = "system" | "reduce" | "full";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage
  }
}

export function parseReduceMotionPreference(
  value: string | null | undefined,
): ReduceMotionPreference {
  if (value === "reduce" || value === "full" || value === "system") {
    return value;
  }
  return "system";
}

export function getReduceMotionPreference(): ReduceMotionPreference {
  return parseReduceMotionPreference(readStorage(REDUCE_MOTION_KEY));
}

export function setReduceMotionPreference(value: ReduceMotionPreference) {
  writeStorage(REDUCE_MOTION_KEY, value);
}

export function clearReduceMotionPreference() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REDUCE_MOTION_KEY);
  } catch {
    // ignore
  }
}

import { clearShortcutPreferences } from "@/lib/preferences/shortcuts";

/** Wipe app-level preference keys (not theme, not account, not workspace data). */
export function clearAppLocalPreferences() {
  clearReduceMotionPreference();
  clearShortcutPreferences();
  if (typeof window === "undefined") return;
  const keys = [
    "notoria.tutorials.completed",
    "notoria.vocabulary.viewMode",
    "notoria.exercise.studioSource",
  ];
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Apply preference to <html> so CSS can react beyond Framer Motion. */
export function applyReduceMotionToDocument(
  preference: ReduceMotionPreference,
  systemPrefersReduce: boolean,
) {
  if (typeof document === "undefined") return;
  const active =
    preference === "reduce" ||
    (preference === "system" && systemPrefersReduce);
  document.documentElement.dataset.reduceMotion = active ? "reduce" : "full";
}

export function resolveFramerReducedMotion(
  preference: ReduceMotionPreference,
): "user" | "always" | "never" {
  if (preference === "reduce") return "always";
  if (preference === "full") return "never";
  return "user";
}
