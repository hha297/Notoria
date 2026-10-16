import { describe, expect, it } from "vitest";
import { isAdminRole } from "@/lib/auth/roles";

describe("isAdminRole", () => {
  it("accepts ADMIN only", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});
