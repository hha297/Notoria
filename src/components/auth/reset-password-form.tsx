"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
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
  const confirmErrorId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverPasswordError, setServerPasswordError] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const passwordError = useMemo(() => {
    if (serverPasswordError) return serverPasswordError;
    if (!password) return null;
    if (password.length < 8) return t("passwordTooShort");
    return null;
  }, [password, serverPasswordError, t]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return null;
    if (confirmPassword !== password) return t("passwordMismatch");
    return null;
  }, [confirmPassword, password, t]);

  const formInvalid =
    !password ||
    !confirmPassword ||
    Boolean(passwordError) ||
    Boolean(confirmError);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setServerPasswordError(null);
    if (formInvalid) return;

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
        if (code === "SAME_AS_OLD_PASSWORD") {
          setServerPasswordError(t("passwordSameAsCurrent"));
          return;
        }
        if (code === "INVALID_PASSWORD") {
          setServerPasswordError(t("passwordTooShort"));
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
            setFormError(null);
            setServerPasswordError(null);
          }}
          className={mx(styles, "auth-input")}
          minLength={8}
          maxLength={128}
          required
          disabled={isPending}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={
            passwordError ? passwordHintId : `${passwordHintId}-hint`
          }
        />
        {passwordError ? (
          <p
            id={passwordHintId}
            className={mx(styles, "auth-field-error")}
            role="alert"
          >
            {passwordError}
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
            setFormError(null);
          }}
          className={mx(styles, "auth-input")}
          minLength={8}
          maxLength={128}
          required
          disabled={isPending}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? confirmErrorId : undefined}
        />
        {confirmError ? (
          <p
            id={confirmErrorId}
            className={mx(styles, "auth-field-error")}
            role="alert"
          >
            {confirmError}
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
        disabled={isPending || formInvalid}
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
