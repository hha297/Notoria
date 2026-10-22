import { describe, expect, it } from "vitest";
import {
  hasEntitlementOverride,
  isAdminRole,
  isTesterRole,
} from "@/lib/auth/roles";

describe("isAdminRole", () => {
  it("accepts ADMIN only", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole("TESTER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

describe("tester role", () => {
  it("is not administrative but overrides entitlements", () => {
    expect(isTesterRole("TESTER")).toBe(true);
    expect(isTesterRole("ADMIN")).toBe(false);
    expect(hasEntitlementOverride("TESTER")).toBe(true);
    expect(hasEntitlementOverride("ADMIN")).toBe(true);
    expect(hasEntitlementOverride("USER")).toBe(false);
  });
});
