import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { FeedbackForm } from "@/components/help/feedback-form";
import { SupportFaq } from "@/components/help/support-faq";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import helpStyles from "@/components/style/help/help.module.css";
import { mx } from "@/lib/css-module";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Common questions about Notoria, plus a simple way to report bugs, request features, or send feedback.",
  alternates: { canonical: "https://www.notoria.fi/support" },
};

export default async function SupportPage() {
  const t = await getTranslations("sitePages.support");
  const session = await auth();
  const authenticated = Boolean(session?.user?.id && session.user.email);
  const accountEmail = session?.user?.email ?? null;

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <div className={mx(helpStyles, "support-layout")}>
        <SupportFaq />

        <section
          className={mx(helpStyles, "feedback-section")}
          aria-labelledby="support-feedback-title"
        >
          <div className={mx(helpStyles, "feedback-header")}>
            <h2
              id="support-feedback-title"
              className={mx(helpStyles, "feedback-title")}
            >
              {t("feedback.title")}
            </h2>
            <p className={mx(helpStyles, "feedback-lede")}>{t("feedback.lede")}</p>
          </div>

          <FeedbackForm
            authenticated={authenticated}
            accountEmail={accountEmail}
          />
        </section>

        <p className={mx(helpStyles, "support-contact-cta")}>
          {t("contactCta.prompt")}{" "}
          <Link
            href="/contact"
            className={mx(helpStyles, "support-contact-link")}
          >
            {t("contactCta.link")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </PublicPageShell>
  );
}
