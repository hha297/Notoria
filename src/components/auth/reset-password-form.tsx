"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import { resetPassword } from "@/lib/actions/password-reset";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const formErrorId = useId();
  const passwordHintId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function clearErrors() {
    setFieldError(null);
    setFormError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    clearErrors();

    if (password.length < 8) {
      setFieldError(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      try {
        await resetPassword({
          token,
          password,
          confirmPassword,
        });
        setDone(true);
        window.setTimeout(() => {
          router.push("/sign-in");
          router.refresh();
        }, 1600);
      } catch (err) {
        const code = err instanceof Error ? err.message : "GENERIC";
        if (code === "PASSWORD_MISMATCH") {
          setFormError(t("passwordMismatch"));
          return;
        }
        if (code === "INVALID_PASSWORD") {
          setFieldError(t("passwordTooShort"));
          return;
        }
        if (code === "INVALID_TOKEN") {
          setFormError(t("resetTokenInvalid"));
          return;
        }
        setFormError(t("resetPasswordFailed"));
      }
    });
  }

  if (done) {
    return (
      <div className={mx(styles, "auth-form")}>
        <div className={mx(styles, "auth-success")} role="status">
          <p className={mx(styles, "auth-success-title")}>
            {t("resetPasswordSuccessTitle")}
          </p>
          <p className={mx(styles, "auth-success-body")}>
            {t("resetPasswordSuccess")}
          </p>
        </div>
        <Link
          href="/sign-in"
          className={mx(
            styles,
            buttonVariants({ size: "lg" }),
            "auth-submit w-full",
          )}
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={mx(styles, "auth-form")}
      aria-describedby={formError ? formErrorId : undefined}
    >
      <div className={mx(styles, "auth-field")}>
        <Label htmlFor="new-password" className={mx(styles, "auth-label")}>
          {t("newPassword")}
        </Label>
        <PasswordInput
          id="new-password"
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
          disabled={isPending}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={
            fieldError ? passwordHintId : `${passwordHintId}-hint`
          }
        />
        {fieldError ? (
          <p
            id={passwordHintId}
            className={mx(styles, "auth-field-error")}
            role="alert"
          >
            {fieldError}
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

      <div className={mx(styles, "auth-field")}>
        <Label htmlFor="confirm-password" className={mx(styles, "auth-label")}>
          {t("confirmPassword")}
        </Label>
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearErrors();
          }}
          className={mx(styles, "auth-input")}
          minLength={8}
          maxLength={128}
          required
          disabled={isPending}
          aria-invalid={formError === t("passwordMismatch") ? true : undefined}
        />
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
          isPending || password.length < 8 || confirmPassword.length < 8
        }
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {isPending ? t("resettingPassword") : t("resetPassword")}
      </Button>

      <p className={mx(styles, "auth-switch")}>
        <Link href="/sign-in" className={mx(styles, "auth-switch-link")}>
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
