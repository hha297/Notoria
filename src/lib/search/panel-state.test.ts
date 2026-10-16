import { describe, expect, it } from "vitest";
import {
  dismissSearchPanel,
  shouldApplyPendingEnterNavigation,
} from "@/lib/search/panel-state";

describe("dismissSearchPanel", () => {
  it("closes the panel and clears pending enter without touching query text", () => {
    expect(
      dismissSearchPanel({ open: true, pendingEnter: true }),
    ).toEqual({ open: false, pendingEnter: false });
  });
});

describe("shouldApplyPendingEnterNavigation", () => {
  it("blocks delayed Enter navigation after the panel was closed", () => {
    expect(shouldApplyPendingEnterNavigation(false)).toBe(false);
    expect(shouldApplyPendingEnterNavigation(true)).toBe(true);
  });
});
