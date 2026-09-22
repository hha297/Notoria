import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

export const metadata: Metadata = {
  title: "About · Notoria",
  description:
    "What Notoria is, who it is for, and what the private language-learning workspace provides.",
  alternates: { canonical: "https://www.notoria.fi/about" },
};

export default async function AboutPage() {
  const t = await getTranslations("sitePages.about");

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <article className={mx(styles, "legal-prose")}>
        <section>
          <h2>{t("what.title")}</h2>
          <p>{t("what.body")}</p>
        </section>
        <section>
          <h2>{t("who.title")}</h2>
          <p>{t("who.body")}</p>
        </section>
        <section>
          <h2>{t("provides.title")}</h2>
          <ul>
            <li>{t("provides.items.vocab")}</li>
            <li>{t("provides.items.practice")}</li>
            <li>{t("provides.items.create")}</li>
            <li>{t("provides.items.listenSpeak")}</li>
          </ul>
          <p>{t("provides.note")}</p>
        </section>
      </article>
    </PublicPageShell>
  );
}
