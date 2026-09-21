"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestWelcomeModalOnLogin } from "@/lib/prompts/storage";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type GoogleSignInButtonProps = {
  /** Where Auth.js should send the user after Google auth. */
  callbackUrl?: string;
  disabled?: boolean;
};

/**
 * Starts Google OAuth via Auth.js. New users land on `/` without a workspace
 * and are redirected to shared learning-language onboarding.
 */
export function GoogleSignInButton({
  callbackUrl = "/",
  disabled = false,
}: GoogleSignInButtonProps) {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      requestWelcomeModalOnLogin();
      await signIn("google", { callbackUrl });
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="auth-oauth-button"
      disabled={disabled || isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <GoogleGlyph className="auth-oauth-glyph size-4" />
      )}
      {isLoading ? t("continuingWithGoogle") : t("continueWithGoogle")}
    </Button>
  );
}

export function AuthOAuthDivider() {
  const t = useTranslations("auth");

  return (
    <div
      className="auth-oauth-divider"
      role="separator"
      aria-label={t("orContinueWith")}
    >
      <span className="auth-oauth-divider-line" aria-hidden />
      <span className="auth-oauth-divider-label">{t("orContinueWith")}</span>
      <span className="auth-oauth-divider-line" aria-hidden />
    </div>
  );
}

/** Google button + divider, or null when OAuth is not configured. */
export function AuthGoogleSection({
  enabled,
  disabled = false,
  callbackUrl = "/",
}: {
  enabled: boolean;
  disabled?: boolean;
  callbackUrl?: string;
}) {
  if (!enabled) return null;

  return (
    <>
      <GoogleSignInButton callbackUrl={callbackUrl} disabled={disabled} />
      <AuthOAuthDivider />
    </>
  );
}
