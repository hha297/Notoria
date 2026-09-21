import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleAuthConfigured } from "@/lib/auth/google";

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  const googleEnabled = isGoogleAuthConfigured();

  return (
    <AuthPageShell
      eyebrow={t("signUpEyebrow")}
      title={t("createAccountTitle")}
      description={t("registerDescription")}
    >
      <RegisterForm googleEnabled={googleEnabled} />
    </AuthPageShell>
  );
}
