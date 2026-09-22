import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";
import {
  NOTORIA_CONTACT_EMAIL,
  NOTORIA_CONTACT_MAILTO,
  NOTORIA_CONTACT_PHONE_DISPLAY,
  NOTORIA_CONTACT_TEL,
  feedbackMailto,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "Help & Support · Notoria",
  description:
    "Get help with Notoria, report bugs, suggest features, or send feedback.",
  alternates: { canonical: "https://www.notoria.fi/help" },
};

export default async function HelpPage() {
  const t = await getTranslations("sitePages.help");

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <article className={mx(styles, "legal-prose")}>
        <section>
          <h2>{t("faq.title")}</h2>
          <h3>{t("faq.account.q")}</h3>
          <p>{t("faq.account.a")}</p>
          <h3>{t("faq.pro.q")}</h3>
          <p>{t("faq.pro.a")}</p>
          <h3>{t("faq.data.q")}</h3>
          <p>{t("faq.data.a")}</p>
          <h3>{t("faq.ai.q")}</h3>
          <p>{t("faq.ai.a")}</p>
        </section>

        <section>
          <h2>{t("reach.title")}</h2>
          <p>{t("reach.body")}</p>
          <ul>
            <li>
              <a href={feedbackMailto("bug")}>{t("reach.bug")}</a>
            </li>
            <li>
              <a href={feedbackMailto("feature")}>{t("reach.feature")}</a>
            </li>
            <li>
              <a href={feedbackMailto("feedback")}>{t("reach.feedback")}</a>
            </li>
          </ul>
          <p>{t("reach.note")}</p>
        </section>

        <section>
          <h2>{t("contact.title")}</h2>
          <ul>
            <li>
              {t("contact.emailLabel")}:{" "}
              <a href={NOTORIA_CONTACT_MAILTO}>{NOTORIA_CONTACT_EMAIL}</a>
            </li>
            <li>
              {t("contact.phoneLabel")}:{" "}
              <a href={NOTORIA_CONTACT_TEL}>{NOTORIA_CONTACT_PHONE_DISPLAY}</a>
            </li>
          </ul>
        </section>
      </article>
    </PublicPageShell>
  );
}
