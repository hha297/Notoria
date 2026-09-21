"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import { cn } from "@/lib/utils";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const formErrorId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t("emailInvalid"));
      return;
    }

    startTransition(async () => {
      try {
        await requestPasswordReset({ email: trimmed });
        setSent(true);
      } catch (err) {
        if (err instanceof Error && err.message === "INVALID_EMAIL") {
          setError(t("emailInvalid"));
          return;
        }
        setError(t("forgotPasswordFailed"));
      }
    });
  }

  if (sent) {
    return (
      <div className="auth-form">
        <div className="auth-success" role="status">
          <p className="auth-success-title">{t("forgotPasswordSentTitle")}</p>
          <p className="auth-success-body">{t("forgotPasswordSent")}</p>
        </div>
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ size: "lg" }), "auth-submit w-full")}
        >
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="auth-form"
      aria-describedby={error ? formErrorId : undefined}
    >
      <div className="auth-field">
        <Label htmlFor="forgot-email" className="auth-label">
          {t("email")}
        </Label>
        <Input
          id="forgot-email"
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
            if (error) setError(null);
          }}
          className="auth-input"
          required
          disabled={isPending}
          aria-invalid={error ? true : undefined}
        />
      </div>

      {error ? (
        <p
          id={formErrorId}
          className="auth-form-error"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="auth-submit"
        disabled={isPending || !email.trim()}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {isPending ? t("sendingResetLink") : t("sendResetLink")}
      </Button>

      <p className="auth-switch">
        <Link href="/sign-in" className="auth-switch-link">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
