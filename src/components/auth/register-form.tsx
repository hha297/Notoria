"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  AuthGoogleSection,
} from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import { registerUser } from "@/lib/actions/auth";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function clearErrors() {
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

    if (password.length < 8) {
      next.password = t("passwordTooShort");
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

      setFormError(t("registerFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={mx(styles, "auth-form-stack")}>
      {/* Google skips the email/password form entirely. */}
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
              clearErrors();
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
              clearErrors();
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
              clearErrors();
            }}
            className={mx(styles, "auth-input")}
            minLength={8}
            maxLength={128}
            required
            disabled={isLoading}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? passwordHintId : `${passwordHintId}-hint`
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
          ) : (
            <p
              id={`${passwordHintId}-hint`}
              className={mx(styles, "auth-field-hint")}
            >
              {t("passwordHint")}
            </p>
          )}
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
            isLoading || !name.trim() || !email.trim() || password.length < 8
          }
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {isLoading ? t("creatingAccount") : t("createAccount")}
        </Button>

        <p className={mx(styles, "auth-switch")}>
          {t("hasAccount")}{" "}
          <Link href="/sign-in" className={mx(styles, "auth-switch-link")}>
            {t("signIn")}
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
