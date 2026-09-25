import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    alternates: {
      canonical: "https://www.notoria.fi/privacy",
    },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell
      title={t("privacyTitle")}
      updatedLabel={t("updated", { date: t("updatedDate") })}
      active="privacy"
    >
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
