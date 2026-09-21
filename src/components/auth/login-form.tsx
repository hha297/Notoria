"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
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
import { requestWelcomeModalOnLogin } from "@/lib/prompts/storage";

function oauthErrorMessage(
  error: string | null,
  t: ReturnType<typeof useTranslations<"auth">>,
): string | null {
  if (!error) return null;
  if (error === "AccessDenied" || error === "OAuthCallback") {
    return t("oauthCancelled");
  }
  if (error === "OAuthAccountNotLinked") {
    return t("oauthAccountNotLinked");
  }
  if (error === "Configuration") {
    return t("oauthNotConfigured");
  }
  return t("oauthFailed");
}

export function LoginForm({
  googleEnabled = false,
}: {
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const formErrorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const oauthError = useMemo(
    () => oauthErrorMessage(searchParams.get("error"), t),
    [searchParams, t],
  );

  const displayError = error ?? oauthError;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }

      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      requestWelcomeModalOnLogin();
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(t("invalidCredentials"));
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
        aria-describedby={displayError ? formErrorId : undefined}
      >
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
              if (error) setError(null);
            }}
            className={mx(styles, "auth-input")}
            required
            disabled={isLoading}
            aria-invalid={displayError ? true : undefined}
          />
        </div>

        <div className={mx(styles, "auth-field")}>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className={mx(styles, "auth-label")}>
              {t("password")}
            </Label>
            <Link
              href="/forgot-password"
              className={mx(styles, "auth-forgot-link")}
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            className={mx(styles, "auth-input")}
            required
            disabled={isLoading}
            aria-invalid={displayError ? true : undefined}
          />
        </div>

        {displayError ? (
          <p
            id={formErrorId}
            className={mx(styles, "auth-form-error")}
            role="alert"
            aria-live="assertive"
          >
            {displayError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className={mx(styles, "auth-submit")}
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {isLoading ? t("signingIn") : t("signIn")}
        </Button>

        <p className={mx(styles, "auth-switch")}>
          {t("noAccount")}{" "}
          <Link href="/sign-up" className={mx(styles, "auth-switch-link")}>
            {t("createAccount")}
          </Link>
        </p>
      </form>
    </div>
  );
}
