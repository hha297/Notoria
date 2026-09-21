import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

function LoginFormFallback() {
  return (
    <div className="auth-form" aria-hidden>
      <div className="auth-field">
        <div className="auth-skeleton auth-skeleton-label" />
        <div className="auth-skeleton auth-skeleton-input" />
      </div>
      <div className="auth-field">
        <div className="auth-skeleton auth-skeleton-label" />
        <div className="auth-skeleton auth-skeleton-input" />
      </div>
      <div className="auth-skeleton auth-skeleton-button" />
    </div>
  );
}

export default async function SignInPage() {
  const t = await getTranslations("auth");
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <AuthPageShell
      eyebrow={t("signInEyebrow")}
      title={t("welcomeBack")}
      description={t("signInDescription")}
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm googleEnabled={googleEnabled} />
      </Suspense>
    </AuthPageShell>
  );
}
