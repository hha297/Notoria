"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import {
  getPasswordRequirementStates,
  type PasswordRequirementId,
} from "@/lib/auth/password";
import { cn } from "@/lib/utils";

type PasswordRequirementsProps = {
  password: string;
  id?: string;
};

const REQUIREMENT_MESSAGE_KEYS: Record<
  PasswordRequirementId,
  | "passwordRequirements.minLength"
  | "passwordRequirements.uppercase"
  | "passwordRequirements.lowercase"
  | "passwordRequirements.number"
  | "passwordRequirements.special"
> = {
  minLength: "passwordRequirements.minLength",
  uppercase: "passwordRequirements.uppercase",
  lowercase: "passwordRequirements.lowercase",
  number: "passwordRequirements.number",
  special: "passwordRequirements.special",
};

export function PasswordRequirements({
  password,
  id,
}: PasswordRequirementsProps) {
  const t = useTranslations("auth");
  const states = getPasswordRequirementStates(password);

  return (
    <ul
      id={id}
      className={mx(styles, "auth-password-requirements")}
      aria-label={t("passwordRequirements.label")}
    >
      {states.map((item) => (
        <li
          key={item.id}
          className={cn(
            mx(styles, "auth-password-requirement"),
            item.met && mx(styles, "is-met"),
          )}
        >
          <span
            className={mx(styles, "auth-password-requirement-icon")}
            aria-hidden
          >
            {item.met ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
          </span>
          <span className={mx(styles, "auth-password-requirement-text")}>
            {t(REQUIREMENT_MESSAGE_KEYS[item.id])}
          </span>
          <span className="sr-only">
            {item.met
              ? t("passwordRequirements.met")
              : t("passwordRequirements.unmet")}
          </span>
        </li>
      ))}
    </ul>
  );
}
