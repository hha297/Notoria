import { describe, expect, it } from "vitest";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetExpiresAt,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/auth/password-reset-token";

describe("password reset tokens", () => {
  it("generates opaque high-entropy tokens", () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens without storing the raw value shape", () => {
    const token = generatePasswordResetToken();
    const hashed = hashPasswordResetToken(token);
    expect(hashed).not.toEqual(token);
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPasswordResetToken(token)).toEqual(hashed);
  });

  it("expires tokens within the expected window", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const expires = passwordResetExpiresAt(from);
    expect(expires.getTime() - from.getTime()).toBe(PASSWORD_RESET_TOKEN_TTL_MS);
  });
});
