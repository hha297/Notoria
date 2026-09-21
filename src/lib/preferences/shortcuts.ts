export type ShortcutId =
  | "openSearch"
  | "toggleTheme"
  | "quickSave"
  | "quickEdit"
  | "quickView"
  | "download"
  | "deleteItem"
  | "createNew"
  | "goBack"
  | "goForward";

export type ShortcutChord = {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
};

export type ShortcutDefinition = {
  id: ShortcutId;
  /** i18n key under settings.shortcuts.actions.* */
  actionKey: string;
  /**
   * Built-in chords for this action.
   * Empty = unbound until the user adds a shortcut in Settings.
   */
  defaultChords: ShortcutChord[];
  /**
   * When false, hidden from the Add shortcut picker.
   * Still shown in the bindings list when it has chords (built-in defaults).
   */
  addable?: boolean;
};

/**
 * Built-in global productivity actions.
 * Users remap keys — they do not invent actions.
 * Only list actions the app can actually trigger (often context-aware).
 */
export const APP_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "openSearch",
    actionKey: "openSearch",
    defaultChords: [{ key: "k", mod: true, shift: false, alt: false }],
    // Already bound by default — no need to pick it when adding a shortcut.
    addable: false,
  },
  {
    id: "toggleTheme",
    actionKey: "toggleTheme",
    defaultChords: [],
  },
  {
    id: "quickSave",
    actionKey: "quickSave",
    defaultChords: [],
  },
  {
    id: "quickEdit",
    actionKey: "quickEdit",
    defaultChords: [],
  },
  {
    id: "quickView",
    actionKey: "quickView",
    defaultChords: [],
  },
  {
    id: "download",
    actionKey: "download",
    defaultChords: [],
  },
  {
    id: "deleteItem",
    actionKey: "deleteItem",
    defaultChords: [],
  },
  {
    id: "createNew",
    actionKey: "createNew",
    defaultChords: [],
  },
  {
    id: "goBack",
    actionKey: "goBack",
    defaultChords: [],
  },
  {
    id: "goForward",
    actionKey: "goForward",
    defaultChords: [],
  },
];

export function isShortcutAddable(def: ShortcutDefinition): boolean {
  return def.addable !== false;
}

/** Actions offered in the Add shortcut picker. */
export function addableAppShortcuts(): ShortcutDefinition[] {
  return APP_SHORTCUTS.filter(isShortcutAddable);
}

const SHORTCUTS_KEY = "notoria.preferences.shortcuts";
const SHORTCUTS_ENABLED_KEY = "notoria.preferences.shortcutsEnabled";

/** Legacy id kept only for localStorage migration. */
const LEGACY_FOCUS_SEARCH = "focusSearch";

export type ReservedPurposeKey =
  | "newWindow"
  | "newTab"
  | "closeTab"
  | "reopenTab"
  | "closeWindow"
  | "newIncognito"
  | "addressBar"
  | "reload"
  | "hardReload"
  | "nextTab"
  | "prevTab"
  | "print"
  | "openFile"
  | "browserSave"
  | "bookmark"
  | "history"
  | "downloads"
  | "viewSource"
  | "findInPage"
  | "findNext"
  | "findPrev"
  | "devtools"
  | "console"
  | "inspect"
  | "clearData"
  | "taskManager"
  | "altClose"
  | "altTab"
  | "winExplorer"
  | "winDesktop"
  | "winLock"
  | "winRun"
  | "winSettings"
  | "winTaskView"
  | "winClipboard";

export type ReservedShortcutGroup = "ctrl" | "ctrlShift" | "alt" | "win";

export type ReservedShortcutExample = {
  chord: ShortcutChord;
  purposeKey: ReservedPurposeKey;
  group: ReservedShortcutGroup;
  /**
   * OS Windows/Super key (not Ctrl/Cmd).
   * Display-only — browsers rarely deliver these events to the page.
   */
  win?: boolean;
};

/**
 * Browser/OS chords Notoria cannot reliably override.
 * Listed proactively in the recorder — do not wait for capture to fail.
 */
export const BROWSER_RESERVED_SHORTCUTS: ReservedShortcutExample[] = [
  { chord: { key: "n", mod: true, shift: false, alt: false }, purposeKey: "newWindow", group: "ctrl" },
  { chord: { key: "t", mod: true, shift: false, alt: false }, purposeKey: "newTab", group: "ctrl" },
  { chord: { key: "w", mod: true, shift: false, alt: false }, purposeKey: "closeTab", group: "ctrl" },
  { chord: { key: "l", mod: true, shift: false, alt: false }, purposeKey: "addressBar", group: "ctrl" },
  { chord: { key: "r", mod: true, shift: false, alt: false }, purposeKey: "reload", group: "ctrl" },
  { chord: { key: "tab", mod: true, shift: false, alt: false }, purposeKey: "nextTab", group: "ctrl" },
  { chord: { key: "p", mod: true, shift: false, alt: false }, purposeKey: "print", group: "ctrl" },
  { chord: { key: "o", mod: true, shift: false, alt: false }, purposeKey: "openFile", group: "ctrl" },
  { chord: { key: "s", mod: true, shift: false, alt: false }, purposeKey: "browserSave", group: "ctrl" },
  { chord: { key: "d", mod: true, shift: false, alt: false }, purposeKey: "bookmark", group: "ctrl" },
  { chord: { key: "h", mod: true, shift: false, alt: false }, purposeKey: "history", group: "ctrl" },
  { chord: { key: "j", mod: true, shift: false, alt: false }, purposeKey: "downloads", group: "ctrl" },
  { chord: { key: "u", mod: true, shift: false, alt: false }, purposeKey: "viewSource", group: "ctrl" },
  { chord: { key: "f", mod: true, shift: false, alt: false }, purposeKey: "findInPage", group: "ctrl" },
  { chord: { key: "g", mod: true, shift: false, alt: false }, purposeKey: "findNext", group: "ctrl" },
  { chord: { key: "t", mod: true, shift: true, alt: false }, purposeKey: "reopenTab", group: "ctrlShift" },
  { chord: { key: "w", mod: true, shift: true, alt: false }, purposeKey: "closeWindow", group: "ctrlShift" },
  { chord: { key: "n", mod: true, shift: true, alt: false }, purposeKey: "newIncognito", group: "ctrlShift" },
  { chord: { key: "r", mod: true, shift: true, alt: false }, purposeKey: "hardReload", group: "ctrlShift" },
  { chord: { key: "tab", mod: true, shift: true, alt: false }, purposeKey: "prevTab", group: "ctrlShift" },
  { chord: { key: "g", mod: true, shift: true, alt: false }, purposeKey: "findPrev", group: "ctrlShift" },
  { chord: { key: "i", mod: true, shift: true, alt: false }, purposeKey: "devtools", group: "ctrlShift" },
  { chord: { key: "j", mod: true, shift: true, alt: false }, purposeKey: "console", group: "ctrlShift" },
  { chord: { key: "c", mod: true, shift: true, alt: false }, purposeKey: "inspect", group: "ctrlShift" },
  { chord: { key: "delete", mod: true, shift: true, alt: false }, purposeKey: "clearData", group: "ctrlShift" },
  { chord: { key: "escape", mod: true, shift: true, alt: false }, purposeKey: "taskManager", group: "ctrlShift" },
  { chord: { key: "f4", mod: false, shift: false, alt: true }, purposeKey: "altClose", group: "alt" },
  { chord: { key: "tab", mod: false, shift: false, alt: true }, purposeKey: "altTab", group: "alt" },
  { chord: { key: "e", mod: true, shift: false, alt: false }, purposeKey: "winExplorer", group: "win", win: true },
  { chord: { key: "d", mod: true, shift: false, alt: false }, purposeKey: "winDesktop", group: "win", win: true },
  { chord: { key: "l", mod: true, shift: false, alt: false }, purposeKey: "winLock", group: "win", win: true },
  { chord: { key: "r", mod: true, shift: false, alt: false }, purposeKey: "winRun", group: "win", win: true },
  { chord: { key: "i", mod: true, shift: false, alt: false }, purposeKey: "winSettings", group: "win", win: true },
  { chord: { key: "tab", mod: true, shift: false, alt: false }, purposeKey: "winTaskView", group: "win", win: true },
  { chord: { key: "v", mod: true, shift: false, alt: false }, purposeKey: "winClipboard", group: "win", win: true },
];

export const RESERVED_SHORTCUT_GROUPS: ReservedShortcutGroup[] = [
  "ctrl",
  "ctrlShift",
  "alt",
  "win",
];

/** Combinations we never allow users to bind (browser Ctrl/Cmd family only). */
const BLOCKED_CHORDS: ShortcutChord[] = BROWSER_RESERVED_SHORTCUTS.filter(
  (item) => !item.win,
).map((item) => item.chord);

export type ShortcutConflict = {
  id: ShortcutId;
  index: number;
};

export type ShortcutBindingEntry = {
  id: ShortcutId;
  index: number;
  chord: ShortcutChord;
  /** First chord matches the built-in default and is the only binding. */
  isDefault: boolean;
  /** Stored override differs from the built-in default set. */
  isCustomized: boolean;
  /** Extra chord beyond the primary binding for this action. */
  isExtra: boolean;
};

/** Overrides: action → one or more chords. Missing key = use default. */
type ShortcutOverrides = Partial<Record<ShortcutId, ShortcutChord[]>>;

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
    // ignore
  }
}

function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function normalizeKey(key: string): string {
  if (key === " ") return "space";
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

export function chordEquals(a: ShortcutChord, b: ShortcutChord): boolean {
  return (
    a.key === b.key &&
    a.mod === b.mod &&
    a.shift === b.shift &&
    a.alt === b.alt
  );
}

function parseChord(value: unknown): ShortcutChord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.key !== "string") return null;
  return {
    key: normalizeKey(record.key),
    mod: Boolean(record.mod),
    shift: Boolean(record.shift),
    alt: Boolean(record.alt),
  };
}

function chordsEqual(a: ShortcutChord[], b: ShortcutChord[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((chord, index) => chordEquals(chord, b[index]!));
}

export function isBlockedChord(chord: ShortcutChord): boolean {
  return BLOCKED_CHORDS.some((item) => chordEquals(item, chord));
}

/** @deprecated Prefer isBlockedChord — kept for existing call sites. */
export function isReservedChord(chord: ShortcutChord): boolean {
  return isBlockedChord(chord);
}

/** Soft-risk list removed; reserved chords are blocked outright. */
export function isBrowserRiskChord(_chord: ShortcutChord): boolean {
  return false;
}

export type ChordCapturePreview = {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  /** null = modifiers only; show trailing "…" */
  key: string | null;
};

export function capturePreviewFromKeyboardEvent(
  event: KeyboardEvent,
): ChordCapturePreview {
  const raw = event.key;
  const isModifierOnly =
    raw === "Control" ||
    raw === "Meta" ||
    raw === "Shift" ||
    raw === "Alt" ||
    raw === "OS";

  return {
    mod: event.metaKey || event.ctrlKey,
    shift: event.shiftKey,
    alt: event.altKey,
    key: isModifierOnly ? null : normalizeKey(raw),
  };
}

export function chordFromKeyboardEvent(event: KeyboardEvent): ShortcutChord | null {
  const preview = capturePreviewFromKeyboardEvent(event);
  if (preview.key == null) return null;

  return {
    key: preview.key,
    mod: preview.mod,
    shift: preview.shift,
    alt: preview.alt,
  };
}

/** react-hotkeys-hook style string, e.g. "mod+k", "shift+/", "/" */
export function chordToHotkey(chord: ShortcutChord): string {
  const parts: string[] = [];
  if (chord.mod) parts.push("mod");
  if (chord.shift) parts.push("shift");
  if (chord.alt) parts.push("alt");
  parts.push(chord.key === " " ? "space" : chord.key);
  return parts.join("+");
}

function formatKeyLabel(key: string): string {
  if (key === " " || key === "space") return "Space";
  if (key === "/") return "/";
  if (key === "tab") return "Tab";
  if (key === "enter") return "Enter";
  if (key === "escape") return "Esc";
  if (key === "delete") return "Delete";
  if (key === "f4") return "F4";
  if (key === "arrowup") return "↑";
  if (key === "arrowdown") return "↓";
  if (key === "arrowleft") return "←";
  if (key === "arrowright") return "→";
  if (key === "backspace") return "Backspace";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function formatChord(
  chord: ShortcutChord,
  platform: "mac" | "other" = "other",
): string {
  return formatCapturePreview(
    {
      mod: chord.mod,
      shift: chord.shift,
      alt: chord.alt,
      key: chord.key,
    },
    platform,
  );
}

/** Format a reserved example, including Win/Super OS shortcuts. */
export function formatReservedShortcut(
  item: ReservedShortcutExample,
  platform: "mac" | "other" = "other",
): string {
  if (item.win) {
    const pieces = [platform === "mac" ? "⌘" : "Win"];
    if (item.chord.alt) pieces.push(platform === "mac" ? "⌥" : "Alt");
    if (item.chord.shift) pieces.push(platform === "mac" ? "⇧" : "Shift");
    pieces.push(formatKeyLabel(item.chord.key));
    return pieces.join(platform === "mac" ? "" : " + ");
  }
  return formatChord(item.chord, platform);
}

/** Live recorder label, e.g. "Ctrl + …" or "Ctrl + E". */
export function formatCapturePreview(
  preview: ChordCapturePreview,
  platform: "mac" | "other" = "other",
): string {
  const pieces: string[] = [];
  if (preview.mod) pieces.push(platform === "mac" ? "⌘" : "Ctrl");
  if (preview.alt) pieces.push(platform === "mac" ? "⌥" : "Alt");
  if (preview.shift) pieces.push(platform === "mac" ? "⇧" : "Shift");

  if (preview.key == null) {
    if (pieces.length === 0) return "…";
    pieces.push("…");
    return pieces.join(platform === "mac" ? "" : " + ");
  }

  pieces.push(formatKeyLabel(preview.key));
  return pieces.join(platform === "mac" ? "" : " + ");
}

export function getShortcutDefinition(
  id: ShortcutId,
): ShortcutDefinition | undefined {
  return APP_SHORTCUTS.find((item) => item.id === id);
}

function getDefinition(id: ShortcutId): ShortcutDefinition | undefined {
  return getShortcutDefinition(id);
}

function defaultChords(id: ShortcutId): ShortcutChord[] {
  const def = getDefinition(id);
  return def ? [...def.defaultChords] : [];
}

function parseChordList(value: unknown): ShortcutChord[] {
  const single = parseChord(value);
  if (single) return [single];
  if (!Array.isArray(value) || value.length === 0) return [];
  const chords: ShortcutChord[] = [];
  for (const item of value) {
    const chord = parseChord(item);
    if (chord) chords.push(chord);
  }
  return chords;
}

function parseOverrides(raw: string | null): ShortcutOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const record = parsed as Record<string, unknown>;
    const result: ShortcutOverrides = {};

    for (const def of APP_SHORTCUTS) {
      const chords = parseChordList(record[def.id]);
      if (chords.length > 0) {
        result[def.id] = chords;
      }
    }

    // Migrate legacy "focusSearch" into Search as an extra chord.
    const legacyFocus = parseChordList(record[LEGACY_FOCUS_SEARCH]);
    if (legacyFocus.length > 0) {
      const search = result.openSearch ?? defaultChords("openSearch");
      const merged = [...search];
      for (const chord of legacyFocus) {
        if (!merged.some((item) => chordEquals(item, chord))) {
          merged.push(chord);
        }
      }
      if (!chordsEqual(merged, defaultChords("openSearch"))) {
        result.openSearch = merged;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function getShortcutOverrides(): ShortcutOverrides {
  return parseOverrides(readStorage(SHORTCUTS_KEY));
}

function persistOverrides(next: ShortcutOverrides) {
  const cleaned: ShortcutOverrides = {};
  for (const def of APP_SHORTCUTS) {
    const chords = next[def.id];
    if (!chords || chords.length === 0) continue;
    if (chordsEqual(chords, def.defaultChords)) continue;
    cleaned[def.id] = chords;
  }

  if (Object.keys(cleaned).length === 0) {
    removeStorage(SHORTCUTS_KEY);
  } else {
    writeStorage(SHORTCUTS_KEY, JSON.stringify(cleaned));
  }
  dispatchShortcutsChanged();
}

/** All effective chords for an action (default or override). */
export function getShortcutChords(id: ShortcutId): ShortcutChord[] {
  const overrides = getShortcutOverrides();
  return overrides[id] ?? defaultChords(id);
}

/** Primary chord — used for compact UI hints (e.g. search placeholder). */
export function getShortcutChord(id: ShortcutId): ShortcutChord {
  const chords = getShortcutChords(id);
  if (chords[0]) return chords[0];
  return { key: "", mod: false, shift: false, alt: false };
}

export function getAllShortcutBindings(): Record<ShortcutId, ShortcutChord[]> {
  const result = {} as Record<ShortcutId, ShortcutChord[]>;
  for (const def of APP_SHORTCUTS) {
    result[def.id] = getShortcutChords(def.id);
  }
  return result;
}

/** Flat list for the settings UI — one row per binding. */
export function listShortcutBindings(
  bindings: Record<ShortcutId, ShortcutChord[]> = getAllShortcutBindings(),
): ShortcutBindingEntry[] {
  const overrides = getShortcutOverrides();
  const entries: ShortcutBindingEntry[] = [];

  for (const def of APP_SHORTCUTS) {
    const chords = bindings[def.id] ?? defaultChords(def.id);
    if (chords.length === 0) continue;

    const customized = Boolean(overrides[def.id]);
    const defaults = def.defaultChords;
    const matchesDefaults =
      defaults.length > 0 && chordsEqual(chords, defaults);

    chords.forEach((chord, index) => {
      const isDefault =
        matchesDefaults &&
        index < defaults.length &&
        chordEquals(chord, defaults[index]!);
      entries.push({
        id: def.id,
        index,
        chord,
        isDefault,
        isCustomized: customized && index === 0 && !matchesDefaults,
        isExtra: index > 0,
      });
    });
  }

  return entries;
}

export function actionHasBuiltInDefault(id: ShortcutId): boolean {
  return defaultChords(id).length > 0;
}

export function findShortcutConflict(
  chord: ShortcutChord,
  exclude?: { id: ShortcutId; index: number },
  bindings: Record<ShortcutId, ShortcutChord[]> = getAllShortcutBindings(),
): ShortcutConflict | null {
  for (const def of APP_SHORTCUTS) {
    const chords = bindings[def.id] ?? [];
    for (let index = 0; index < chords.length; index += 1) {
      if (exclude && exclude.id === def.id && exclude.index === index) {
        continue;
      }
      if (chordEquals(chords[index]!, chord)) {
        return { id: def.id, index };
      }
    }
  }
  return null;
}

function cloneBindings(
  bindings: Record<ShortcutId, ShortcutChord[]> = getAllShortcutBindings(),
): Record<ShortcutId, ShortcutChord[]> {
  const next = {} as Record<ShortcutId, ShortcutChord[]>;
  for (const def of APP_SHORTCUTS) {
    next[def.id] = [...(bindings[def.id] ?? defaultChords(def.id))];
  }
  return next;
}

function removeChordFromBindings(
  bindings: Record<ShortcutId, ShortcutChord[]>,
  conflict: ShortcutConflict,
) {
  const list = [...(bindings[conflict.id] ?? [])];
  list.splice(conflict.index, 1);
  if (list.length === 0) {
    bindings[conflict.id] = defaultChords(conflict.id);
  } else {
    bindings[conflict.id] = list;
  }
}

/**
 * Replace the chord at `index` for an action.
 * When `replaceConflict` is true, the conflicting binding is removed first.
 */
export function setShortcutChord(
  id: ShortcutId,
  chord: ShortcutChord,
  options: { index?: number; replaceConflict?: boolean } = {},
) {
  const index = options.index ?? 0;
  const next = cloneBindings();
  const list = [...(next[id] ?? defaultChords(id))];

  if (options.replaceConflict) {
    const conflict = findShortcutConflict(chord, { id, index }, next);
    if (conflict) removeChordFromBindings(next, conflict);
  }

  while (list.length <= index) {
    list.push(defaultChords(id)[0] ?? chord);
  }
  list[index] = chord;
  next[id] = list;

  const overrides: ShortcutOverrides = {};
  for (const def of APP_SHORTCUTS) {
    overrides[def.id] = next[def.id];
  }
  persistOverrides(overrides);
}

/** Append an extra chord for an existing action. */
export function addShortcutChord(
  id: ShortcutId,
  chord: ShortcutChord,
  options: { replaceConflict?: boolean } = {},
) {
  const next = cloneBindings();

  if (options.replaceConflict) {
    const conflict = findShortcutConflict(chord, undefined, next);
    if (conflict) removeChordFromBindings(next, conflict);
  }

  next[id] = [...(next[id] ?? defaultChords(id)), chord];

  const overrides: ShortcutOverrides = {};
  for (const def of APP_SHORTCUTS) {
    overrides[def.id] = next[def.id];
  }
  persistOverrides(overrides);
}

export function removeShortcutChord(id: ShortcutId, index: number) {
  const next = cloneBindings();
  const list = [...(next[id] ?? defaultChords(id))];
  if (index < 0 || index >= list.length) return;

  list.splice(index, 1);
  next[id] = list.length > 0 ? list : defaultChords(id);

  const overrides: ShortcutOverrides = {};
  for (const def of APP_SHORTCUTS) {
    overrides[def.id] = next[def.id];
  }
  persistOverrides(overrides);
}

export function resetShortcut(id: ShortcutId) {
  const next = { ...getShortcutOverrides() };
  delete next[id];
  persistOverrides(next);
}

export function resetAllShortcuts() {
  removeStorage(SHORTCUTS_KEY);
  dispatchShortcutsChanged();
}

export function areShortcutsEnabled(): boolean {
  const raw = readStorage(SHORTCUTS_ENABLED_KEY);
  if (raw === null) return true;
  return raw !== "0";
}

export function setShortcutsEnabled(enabled: boolean) {
  writeStorage(SHORTCUTS_ENABLED_KEY, enabled ? "1" : "0");
  dispatchShortcutsChanged();
}

export function isShortcutCustomized(id: ShortcutId): boolean {
  return Boolean(getShortcutOverrides()[id]);
}

const CHANGE_EVENT = "notoria:shortcuts-changed";

function dispatchShortcutsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeShortcutsChanged(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function clearShortcutPreferences() {
  removeStorage(SHORTCUTS_KEY);
  removeStorage(SHORTCUTS_ENABLED_KEY);
  dispatchShortcutsChanged();
}
