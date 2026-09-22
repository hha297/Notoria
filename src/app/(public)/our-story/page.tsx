import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import legalStyles from "@/components/style/legal/legal.module.css";
import storyStyles from "@/components/style/legal/story.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Why Notoria exists — a private self-study workspace built because language-learning material kept ending up everywhere except where practice happened.",
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
      <article className={cn(mx(legalStyles, "legal-prose"), mx(storyStyles, "story"))}>
        <section>
          <h2>{t("frustration.title")}</h2>
          <p>{t("frustration.p1")}</p>
          <p>{t("frustration.p2")}</p>
          <p>{t("frustration.p3")}</p>
          <p>{t("frustration.p4")}</p>
          <p className={mx(storyStyles, "story-beat")}>{t("frustration.beat")}</p>
        </section>

        <section>
          <h2>{t("realisation.title")}</h2>
          <p>{t("realisation.p1")}</p>
          <p>{t("realisation.p2")}</p>
          <p>{t("realisation.p3")}</p>
          <p className={mx(storyStyles, "story-beat")}>{t("realisation.beat")}</p>
        </section>

        <section>
          <h2>{t("exists.title")}</h2>
          <p>{t("exists.p1")}</p>
          <p>{t("exists.p2")}</p>
          <p>{t("exists.p3")}</p>
          <p>{t("exists.p4")}</p>
        </section>

        <section>
          <h2>{t("believes.title")}</h2>
          <p>{t("believes.p1")}</p>
          <p>{t("believes.p2")}</p>
          <p>{t("believes.p3")}</p>
          <p className={mx(storyStyles, "story-beat")}>{t("believes.beat")}</p>
        </section>

        <section>
          <h2>{t("going.title")}</h2>
          <p>{t("going.p1")}</p>
          <p>{t("going.p2")}</p>
          <p>{t("going.p3")}</p>
          <p className={mx(storyStyles, "story-closing")}>{t("going.closing")}</p>
        </section>
      </article>
    </PublicPageShell>
  );
}
