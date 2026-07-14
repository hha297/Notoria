import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function SignInPage() {
  const t = await getTranslations("auth");

  return (
    <AuthPageShell
      title={t("welcomeBack")}
      description={t("signInDescription")}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
