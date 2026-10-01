import { describe, expect, it } from "vitest";
import {
  getPasswordRequirementStates,
  isPasswordValid,
  strongPasswordSchema,
} from "./password";

describe("password requirements", () => {
  it("treats empty as all unmet", () => {
    const states = getPasswordRequirementStates("");
    expect(states.every((s) => !s.met)).toBe(true);
    expect(isPasswordValid("")).toBe(false);
  });

  it("requires at least 8 characters, not exactly 8", () => {
    expect(isPasswordValid("Ab1!aaaa")).toBe(true);
    expect(isPasswordValid("Ab1!aaa")).toBe(false);
    expect(
      getPasswordRequirementStates("Ab1!aaaaaaa").find((s) => s.id === "minLength")
        ?.met,
    ).toBe(true);
  });

  it("requires each character class independently", () => {
    // missing uppercase
    expect(isPasswordValid("ab1!aaaa")).toBe(false);
    // missing lowercase
    expect(isPasswordValid("AB1!AAAA")).toBe(false);
    // missing number
    expect(isPasswordValid("Ab!!aaaa")).toBe(false);
    // missing special
    expect(isPasswordValid("Ab12aaaa")).toBe(false);
  });

  it("does not count whitespace as a special character", () => {
    expect(isPasswordValid("Ab12aaaa ")).toBe(false);
    expect(
      getPasswordRequirementStates("Ab12aaaa ").find((s) => s.id === "special")
        ?.met,
    ).toBe(false);
    expect(isPasswordValid("Ab12aaaa!")).toBe(true);
  });

  it("updates unmet when characters are removed", () => {
    expect(isPasswordValid("Ab1!aaaa")).toBe(true);
    expect(isPasswordValid("Ab1!aaa")).toBe(false);
  });

  it("rejects via zod when weak", () => {
    expect(strongPasswordSchema.safeParse("short").success).toBe(false);
    expect(strongPasswordSchema.safeParse("Ab1!aaaa").success).toBe(true);
  });
});
