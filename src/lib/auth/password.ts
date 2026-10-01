import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Special = non-alphanumeric and not whitespace. */
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9\s]/;

export type PasswordRequirementId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special";

export const PASSWORD_REQUIREMENT_IDS: PasswordRequirementId[] = [
  "minLength",
  "uppercase",
  "lowercase",
  "number",
  "special",
];

export type PasswordRequirementState = {
  id: PasswordRequirementId;
  met: boolean;
};

export function getPasswordRequirementStates(
  password: string,
): PasswordRequirementState[] {
  return [
    { id: "minLength", met: password.length >= PASSWORD_MIN_LENGTH },
    { id: "uppercase", met: HAS_UPPERCASE.test(password) },
    { id: "lowercase", met: HAS_LOWERCASE.test(password) },
    { id: "number", met: HAS_NUMBER.test(password) },
    { id: "special", met: HAS_SPECIAL.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  if (password.length > PASSWORD_MAX_LENGTH) return false;
  return getPasswordRequirementStates(password).every((item) => item.met);
}

/**
 * Strong password for registration (and any flow that sets a new password).
 * Sign-in must not use this — existing accounts may have older weaker passwords.
 */
export const strongPasswordSchema = z
  .string()
  .max(PASSWORD_MAX_LENGTH)
  .refine(isPasswordValid, { message: "PASSWORD_TOO_WEAK" });
