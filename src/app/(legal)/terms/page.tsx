import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsOfUseContent } from "@/components/legal/terms-of-use-content";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms for using Notoria’s private language-learning workspace, accounts, AI features, and Notoria Pro billing.",
  alternates: {
    canonical: "https://www.notoria.fi/terms",
  },
};

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell
      title={t("termsTitle")}
      updatedLabel={t("updated", { date: "23 September 2026" })}
      active="terms"
    >
      <TermsOfUseContent />
    </LegalPageShell>
  );
}
