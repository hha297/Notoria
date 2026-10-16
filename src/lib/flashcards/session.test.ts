import { describe, expect, it } from "vitest";
import {
  canRestoreSession,
  reconcileSessionCursor,
  shouldKeepActiveSession,
} from "@/lib/flashcards/session";
import type { FlashcardSessionState } from "@/types/flashcards";

function session(
  overrides: Partial<FlashcardSessionState> = {},
): FlashcardSessionState {
  return {
    workspaceId: "ws-1",
    filtersKey: "word-to-meaning::::",
    studyMode: "word-to-meaning",
    cardIds: ["a", "b", "c"],
    directions: {},
    currentIndex: 1,
    isFlipped: false,
    ...overrides,
  };
}

describe("canRestoreSession", () => {
  it("restores when filters match even if rated cards left the filtered set", () => {
    const saved = session({ currentIndex: 12, cardIds: Array.from({ length: 30 }, (_, i) => `w${i}`) });
    const availableIds = new Set(["w12", "w13"]); // rated cards dropped out of status filter

    expect(canRestoreSession(saved, "ws-1", saved.filtersKey, availableIds)).toBe(
      true,
    );
  });

  it("rejects mismatched filters or empty decks", () => {
    const saved = session();
    expect(canRestoreSession(saved, "ws-1", "other-filters")).toBe(false);
    expect(canRestoreSession(session({ cardIds: [] }), "ws-1", saved.filtersKey)).toBe(
      false,
    );
  });

  it("rejects an out-of-range cursor", () => {
    expect(
      canRestoreSession(session({ currentIndex: 99 }), "ws-1", "word-to-meaning::::"),
    ).toBe(false);
  });
});

describe("shouldKeepActiveSession", () => {
  it("keeps the in-memory session across word refreshes with the same filters", () => {
    const active = session({ currentIndex: 7 });
    expect(shouldKeepActiveSession(active, "ws-1", active.filtersKey)).toBe(true);
    expect(shouldKeepActiveSession(active, "ws-1", "changed")).toBe(false);
    expect(shouldKeepActiveSession(null, "ws-1", active.filtersKey)).toBe(false);
  });
});

describe("reconcileSessionCursor", () => {
  it("leaves a resolvable cursor unchanged", () => {
    const current = session({ currentIndex: 1 });
    const next = reconcileSessionCursor(current, (id) => id !== "missing");
    expect(next).toBe(current);
  });

  it("skips missing cards without resetting completed progress", () => {
    const current = session({
      cardIds: ["gone", "gone2", "ok", "later"],
      currentIndex: 0,
    });
    const next = reconcileSessionCursor(current, (id) => id === "ok" || id === "later");
    expect(next).toEqual({
      ...current,
      currentIndex: 2,
      isFlipped: false,
    });
  });

  it("returns null when no remaining cards are resolvable", () => {
    const current = session({ cardIds: ["a", "b"], currentIndex: 0 });
    expect(reconcileSessionCursor(current, () => false)).toBeNull();
  });
});
