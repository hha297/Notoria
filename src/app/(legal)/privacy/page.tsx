import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Notoria collects, uses, and deletes personal data and learning content for its private language-learning workspace.",
  alternates: {
    canonical: "https://www.notoria.fi/privacy",
  },
};

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell
      title={t("privacyTitle")}
      updatedLabel={t("updated", { date: "23 September 2026" })}
      active="privacy"
    >
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
