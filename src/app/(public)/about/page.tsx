import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import legalStyles from "@/components/style/legal/legal.module.css";
import aboutStyles from "@/components/style/legal/about.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "Notoria is a private workspace for self-studying any language — built around your own material, not a fixed course catalogue.",
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
      <article
        className={cn(mx(legalStyles, "legal-prose"), mx(aboutStyles, "about"))}
      >
        <section>
          <h2>{t("what.title")}</h2>
          <p>{t("what.p1")}</p>
          <p>{t("what.p2")}</p>
          <p className={mx(aboutStyles, "about-beat")}>{t("what.beat")}</p>
        </section>

        <section>
          <h2>{t("why.title")}</h2>
          <p>{t("why.p1")}</p>
          <p>{t("why.p2")}</p>
          <p>{t("why.p3")}</p>
        </section>

        <section>
          <h2>{t("who.title")}</h2>
          <p>{t("who.p1")}</p>
          <p>{t("who.p2")}</p>
        </section>

        <section>
          <h2>{t("yourWay.title")}</h2>
          <p>{t("yourWay.p1")}</p>
          <p>{t("yourWay.p2")}</p>
          <p className={mx(aboutStyles, "about-beat")}>{t("yourWay.beat")}</p>
        </section>

        <section>
          <h2>{t("provides.title")}</h2>
          <p>{t("provides.intro")}</p>
          <ul className={mx(aboutStyles, "about-list")}>
            <li>{t("provides.items.vocab")}</li>
            <li>{t("provides.items.practice")}</li>
            <li>{t("provides.items.create")}</li>
            <li>{t("provides.items.listenSpeak")}</li>
          </ul>
          <p className={mx(aboutStyles, "about-note")}>{t("provides.note")}</p>
        </section>

        <section>
          <h2>{t("ai.title")}</h2>
          <p>{t("ai.p1")}</p>
          <p>{t("ai.p2")}</p>
          <p>{t("ai.p3")}</p>
        </section>
      </article>
    </PublicPageShell>
  );
}
