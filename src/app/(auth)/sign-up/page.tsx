import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default async function SignUpPage() {
  const t = await getTranslations("auth");

  return (
    <AuthPageShell
      title={t("createAccountTitle")}
      description={t("registerDescription")}
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
