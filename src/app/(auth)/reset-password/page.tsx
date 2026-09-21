import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("resetPasswordTitle") };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations("auth");
  const { token } = await searchParams;
  const safeToken = token?.trim() ?? "";

  return (
    <AuthPageShell
      eyebrow={t("resetPasswordEyebrow")}
      title={t("resetPasswordTitle")}
      description={t("resetPasswordDescription")}
    >
      {safeToken ? (
        <ResetPasswordForm token={safeToken} />
      ) : (
        <div className="auth-form">
          <div className="auth-form-error" role="alert">
            {t("resetTokenMissing")}
          </div>
          <Link
            href="/forgot-password"
            className={cn(buttonVariants({ size: "lg" }), "auth-submit w-full")}
          >
            {t("sendResetLink")}
          </Link>
          <p className="auth-switch">
            <Link href="/sign-in" className="auth-switch-link">
              {t("backToSignIn")}
            </Link>
          </p>
        </div>
      )}
    </AuthPageShell>
  );
}
