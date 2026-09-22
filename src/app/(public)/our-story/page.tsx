import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

export const metadata: Metadata = {
  title: "Our Story · Notoria",
  description:
    "Why Notoria was built — the problem it started from and the direction it is heading.",
  alternates: { canonical: "https://www.notoria.fi/our-story" },
};

export default async function OurStoryPage() {
  const t = await getTranslations("sitePages.ourStory");

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <article className={mx(styles, "legal-prose")}>
        <section>
          <h2>{t("problem.title")}</h2>
          <p>{t("problem.body")}</p>
        </section>
        <section>
          <h2>{t("why.title")}</h2>
          <p>{t("why.body")}</p>
        </section>
        <section>
          <h2>{t("direction.title")}</h2>
          <p>{t("direction.body")}</p>
        </section>
      </article>
    </PublicPageShell>
  );
}
