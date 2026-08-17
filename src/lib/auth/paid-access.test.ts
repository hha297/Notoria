import { describe, expect, it } from "vitest";
import { hasProAccess, isPaidDocumentFormat } from "@/lib/auth/paid-access";

function user(
  overrides: Partial<{
    role: "USER" | "ADMIN";
    subscriptionPlan: "free" | "pro";
    subscriptionStatus: string | null;
  }> = {},
) {
  return {
    role: "USER" as const,
    subscriptionPlan: "free" as const,
    subscriptionStatus: null as string | null,
    ...overrides,
  };
}

describe("paid feature access", () => {
  it("grants access to admins without a Pro subscription", () => {
    expect(hasProAccess(user({ role: "ADMIN" }))).toBe(true);
  });

  it("grants access to active Pro subscribers", () => {
    expect(
      hasProAccess(
        user({ subscriptionPlan: "pro", subscriptionStatus: "active" }),
      ),
    ).toBe(true);
  });

  it("locks free users", () => {
    expect(hasProAccess(user())).toBe(false);
    expect(hasProAccess(null)).toBe(false);
  });

  it("treats PDF and DOCX as paid export formats, not CSV", () => {
    expect(isPaidDocumentFormat("pdf")).toBe(true);
    expect(isPaidDocumentFormat("docx")).toBe(true);
    expect(isPaidDocumentFormat("csv")).toBe(false);
  });
});
