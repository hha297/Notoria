import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import styles from "@/components/style/auth/auth.module.css";
import { mx } from "@/lib/css-module";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

function LoginFormFallback() {
  return (
    <div className={mx(styles, "auth-form")} aria-hidden>
      <div className={mx(styles, "auth-field")}>
        <div
          className={mx(styles, "auth-skeleton auth-skeleton-label")}
        />
        <div
          className={mx(styles, "auth-skeleton auth-skeleton-input")}
        />
      </div>
      <div className={mx(styles, "auth-field")}>
        <div
          className={mx(styles, "auth-skeleton auth-skeleton-label")}
        />
        <div
          className={mx(styles, "auth-skeleton auth-skeleton-input")}
        />
      </div>
      <div className={mx(styles, "auth-skeleton auth-skeleton-button")} />
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
