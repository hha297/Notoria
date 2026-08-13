const COMPLETED_KEY = "notoria.onboarding.completed";
const PENDING_KEY = "notoria.onboarding.pending";
const FIRST_ENTRY_KEY = "notoria.onboarding.first-entry";
const SESSION_PRIORITY_KEY = "notoria.onboarding.session-priority";
const TUTORIALS_KEY = "notoria.tutorials.completed";

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

function readCompletedIds(): Record<string, true> {
  if (typeof window === "undefined") return {};
  const raw = read(localStorage, COMPLETED_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, true>;
  } catch {
    return {};
  }
}

export function isOnboardingCompleted(workspaceId: string): boolean {
  return Boolean(readCompletedIds()[workspaceId]);
}

export function markOnboardingCompleted(workspaceId: string) {
  if (typeof window === "undefined") return;
  const next = readCompletedIds();
  next[workspaceId] = true;
  write(localStorage, COMPLETED_KEY, JSON.stringify(next));
  const pending = readPendingWorkspaceId();
  if (pending === workspaceId) {
    remove(sessionStorage, PENDING_KEY);
  }
  remove(sessionStorage, FIRST_ENTRY_KEY);
}

export function requestWorkspaceOnboarding(workspaceId: string) {
  if (typeof window === "undefined") return;
  write(sessionStorage, PENDING_KEY, workspaceId);
  write(sessionStorage, SESSION_PRIORITY_KEY, "1");
}

/** First successful app entry after signup — uses the default workspace. */
export function requestFirstEntryOnboarding() {
  if (typeof window === "undefined") return;
  write(sessionStorage, FIRST_ENTRY_KEY, "1");
  write(sessionStorage, SESSION_PRIORITY_KEY, "1");
}

export function readPendingWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return read(sessionStorage, PENDING_KEY);
}

export function markOnboardingSessionPriority() {
  if (typeof window === "undefined") return;
  write(sessionStorage, SESSION_PRIORITY_KEY, "1");
}

/**
 * True while first-time workspace onboarding should take priority over
 * the login greeting modal (#65).
 */
export function isOnboardingTakingPriority(): boolean {
  if (typeof window === "undefined") return false;
  return (
    Boolean(read(sessionStorage, PENDING_KEY)) ||
    read(sessionStorage, FIRST_ENTRY_KEY) === "1" ||
    read(sessionStorage, SESSION_PRIORITY_KEY) === "1"
  );
}

export function shouldShowWorkspaceOnboarding(workspaceId: string): boolean {
  if (!workspaceId) return false;
  if (isOnboardingCompleted(workspaceId)) return false;
  if (readPendingWorkspaceId() === workspaceId) return true;
  return read(sessionStorage, FIRST_ENTRY_KEY) === "1";
}

function readCompletedTutorials(): Record<string, true> {
  if (typeof window === "undefined") return {};
  const raw = read(localStorage, TUTORIALS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, true>;
  } catch {
    return {};
  }
}

export function isSectionTutorialCompleted(section: string): boolean {
  return Boolean(readCompletedTutorials()[section]);
}

export function markSectionTutorialCompleted(section: string) {
  if (typeof window === "undefined") return;
  const next = readCompletedTutorials();
  next[section] = true;
  write(localStorage, TUTORIALS_KEY, JSON.stringify(next));
}
