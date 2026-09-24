import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsOfUseContent } from "@/components/legal/terms-of-use-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsTitle"),
    description: t("termsDescription"),
    alternates: {
      canonical: "https://www.notoria.fi/terms",
    },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell
      title={t("termsTitle")}
      updatedLabel={t("updated", { date: t("updatedDate") })}
      active="terms"
    >
      <TermsOfUseContent />
    </LegalPageShell>
  );
}
