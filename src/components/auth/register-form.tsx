"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import {
  AuthGoogleSection,
} from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import { registerUser } from "@/lib/actions/auth";
import {
  isPasswordValid,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/password";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function RegisterForm({
  googleEnabled = false,
}: {
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("auth");
  const formErrorId = useId();
  const nameHintId = useId();
  const emailHintId = useId();
  const passwordHintId = useId();
  const confirmPasswordHintId = useId();
  const passwordRequirementsId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirmPasswordError = useMemo(() => {
    if (fieldErrors.confirmPassword) return fieldErrors.confirmPassword;
    if (!confirmPassword) return null;
    if (confirmPassword !== password) return t("passwordMismatch");
    return null;
  }, [confirmPassword, fieldErrors.confirmPassword, password, t]);

  function clearFieldErrors() {
    setFieldErrors({});
    setFormError(null);
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      next.name = t("nameTooShort");
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = t("emailInvalid");
    }

    if (!isPasswordValid(password)) {
      next.password = t("passwordInvalid");
    }

    if (confirmPassword !== password) {
      next.confirmPassword = t("passwordMismatch");
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError(t("signInAfterRegisterFailed"));
        router.push("/sign-in");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_EXISTS") {
        setFieldErrors({ email: t("emailExists") });
        return;
      }
      if (err instanceof Error && err.message === "PASSWORD_TOO_WEAK") {
        setFieldErrors({ password: t("passwordInvalid") });
        return;
      }

      setFormError(t("registerFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={mx(styles, "auth-form-stack")}>
      <AuthGoogleSection enabled={googleEnabled} disabled={isLoading} />

      <form
        onSubmit={handleSubmit}
        className={mx(styles, "auth-form")}
        aria-describedby={formError ? formErrorId : undefined}
      >
        <div className={mx(styles, "auth-field")}>
          <Label htmlFor="name" className={mx(styles, "auth-label")}>
            {t("name")}
          </Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldErrors();
            }}
            className={mx(styles, "auth-input")}
            required
            minLength={2}
            maxLength={80}
            disabled={isLoading}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? nameHintId : undefined}
          />
          {fieldErrors.name ? (
            <p
              id={nameHintId}
              className={mx(styles, "auth-field-error")}
              role="alert"
            >
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className={mx(styles, "auth-field")}>
          <Label htmlFor="email" className={mx(styles, "auth-label")}>
            {t("email")}
          </Label>
          <Input
            id="email"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldErrors();
            }}
            className={mx(styles, "auth-input")}
            required
            disabled={isLoading}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? emailHintId : undefined}
          />
          {fieldErrors.email ? (
            <p
              id={emailHintId}
              className={mx(styles, "auth-field-error")}
              role="alert"
            >
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className={mx(styles, "auth-field")}>
          <Label htmlFor="password" className={mx(styles, "auth-label")}>
            {t("password")}
          </Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldErrors();
            }}
            className={mx(styles, "auth-input")}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            disabled={isLoading}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password
                ? `${passwordHintId} ${passwordRequirementsId}`
                : passwordRequirementsId
            }
          />
          {fieldErrors.password ? (
            <p
              id={passwordHintId}
              className={mx(styles, "auth-field-error")}
              role="alert"
            >
              {fieldErrors.password}
            </p>
          ) : null}
          <PasswordRequirements
            id={passwordRequirementsId}
            password={password}
          />
        </div>

        <div className={mx(styles, "auth-field")}>
          <Label htmlFor="confirm-password" className={mx(styles, "auth-label")}>
            {t("retypePassword")}
          </Label>
          <PasswordInput
            id="confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldErrors();
            }}
            className={mx(styles, "auth-input")}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
            disabled={isLoading}
            aria-invalid={confirmPasswordError ? true : undefined}
            aria-describedby={
              confirmPasswordError ? confirmPasswordHintId : undefined
            }
          />
          {confirmPasswordError ? (
            <p
              id={confirmPasswordHintId}
              className={mx(styles, "auth-field-error")}
              role="alert"
            >
              {confirmPasswordError}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p
            id={formErrorId}
            className={mx(styles, "auth-form-error")}
            role="alert"
            aria-live="assertive"
          >
            {formError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className={mx(styles, "auth-submit")}
          disabled={
            isLoading ||
            !name.trim() ||
            !email.trim() ||
            !password ||
            !confirmPassword
          }
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="size-4" aria-hidden />
          )}
          {isLoading ? t("creatingAccount") : t("createAccount")}
        </Button>

        <p className={mx(styles, "auth-switch")}>
          {t("hasAccount")}{" "}
          <Link href="/sign-in" className={mx(styles, "auth-switch-link")}>
            {t("signIn")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </form>

      <p className={mx(styles, "auth-agreement")}>
        {t.rich("registerAgreement", {
          terms: (chunks) => <Link href="/terms">{chunks}</Link>,
          privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
        })}
      </p>
    </div>
  );
}
