import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import legalStyles from "@/components/style/legal/legal.module.css";
import contactStyles from "@/components/style/legal/contact.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";
import {
  NOTORIA_CONTACT_EMAIL,
  NOTORIA_CONTACT_MAILTO,
  NOTORIA_CONTACT_PHONE_DISPLAY,
  NOTORIA_CONTACT_TEL,
  NOTORIA_TECHNICAL_EMAIL,
  NOTORIA_TECHNICAL_MAILTO,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Notoria by email or phone — general support at contact@notoria.fi, technical issues to the development contact, or call +358 46 652 2707.",
  alternates: { canonical: "https://www.notoria.fi/contact" },
};

const GENERAL_TOPICS = [
  "questions",
  "account",
  "billing",
  "privacy",
  "other",
] as const;

export default async function ContactPage() {
  const t = await getTranslations("sitePages.contact");

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <div className={cn(mx(legalStyles, "legal-prose"), mx(contactStyles, "contact"))}>
        <p className={mx(contactStyles, "contact-routing")}>{t("routing")}</p>

        <div className={mx(contactStyles, "contact-cards")}>
          <section className={mx(contactStyles, "contact-card")}>
            <div className={mx(contactStyles, "contact-card-top")}>
              <span className={mx(contactStyles, "contact-icon")} aria-hidden>
                <Mail className="size-4" />
              </span>
              <h2 className={mx(contactStyles, "contact-card-title")}>
                {t("general.title")}
              </h2>
            </div>
            <p className={mx(contactStyles, "contact-card-body")}>
              {t("general.body")}
            </p>
            <ul className={mx(contactStyles, "contact-topics")}>
              {GENERAL_TOPICS.map((topic) => (
                <li key={topic}>{t(`general.topics.${topic}`)}</li>
              ))}
            </ul>
            <a
              href={NOTORIA_CONTACT_MAILTO}
              className={mx(contactStyles, "contact-action")}
            >
              {NOTORIA_CONTACT_EMAIL}
            </a>
          </section>

          <section className={mx(contactStyles, "contact-card")}>
            <div className={mx(contactStyles, "contact-card-top")}>
              <span className={mx(contactStyles, "contact-icon")} aria-hidden>
                <Mail className="size-4" />
              </span>
              <h2 className={mx(contactStyles, "contact-card-title")}>
                {t("technical.title")}
              </h2>
            </div>
            <p className={mx(contactStyles, "contact-card-body")}>
              {t("technical.body")}
            </p>
            <a
              href={NOTORIA_TECHNICAL_MAILTO}
              className={mx(contactStyles, "contact-action")}
            >
              {NOTORIA_TECHNICAL_EMAIL}
            </a>
          </section>

          <section className={mx(contactStyles, "contact-card")}>
            <div className={mx(contactStyles, "contact-card-top")}>
              <span className={mx(contactStyles, "contact-icon")} aria-hidden>
                <Phone className="size-4" />
              </span>
              <h2 className={mx(contactStyles, "contact-card-title")}>
                {t("phone.title")}
              </h2>
            </div>
            <p className={mx(contactStyles, "contact-card-body")}>
              {t("phone.body")}
            </p>
            <a
              href={NOTORIA_CONTACT_TEL}
              className={mx(contactStyles, "contact-action")}
            >
              {NOTORIA_CONTACT_PHONE_DISPLAY}
            </a>
          </section>
        </div>

        <p className={mx(contactStyles, "contact-support-cta")}>
          {t("supportCta.prompt")}{" "}
          <Link href="/support" className={mx(contactStyles, "contact-support-link")}>
            {t("supportCta.link")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </PublicPageShell>
  );
}
