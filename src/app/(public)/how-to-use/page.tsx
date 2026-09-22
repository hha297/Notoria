import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import styles from "@/components/style/legal/legal.module.css";
import { mx } from "@/lib/css-module";

export const metadata: Metadata = {
  title: "How to Use · Notoria",
  description:
    "A short guide to using Notoria’s private language-learning workspace.",
  alternates: { canonical: "https://www.notoria.fi/how-to-use" },
};

export default async function HowToUsePage() {
  const t = await getTranslations("sitePages.howToUse");
  const session = await auth();

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <article className={mx(styles, "legal-prose")}>
        <section>
          <h2>{t("idea.title")}</h2>
          <p>{t("idea.body")}</p>
        </section>
        <section>
          <h2>{t("start.title")}</h2>
          <ol>
            <li>{t("start.steps.workspace")}</li>
            <li>{t("start.steps.words")}</li>
            <li>{t("start.steps.notes")}</li>
            <li>{t("start.steps.practice")}</li>
            <li>{t("start.steps.return")}</li>
          </ol>
        </section>
        <section>
          <h2>{t("modules.title")}</h2>
          <ul>
            <li>
              <strong>{t("modules.vocab.label")}</strong> —{" "}
              {t("modules.vocab.body")}
            </li>
            <li>
              <strong>{t("modules.theory.label")}</strong> —{" "}
              {t("modules.theory.body")}
            </li>
            <li>
              <strong>{t("modules.exercises.label")}</strong> —{" "}
              {t("modules.exercises.body")}
            </li>
            <li>
              <strong>{t("modules.writing.label")}</strong> —{" "}
              {t("modules.writing.body")}
            </li>
            <li>
              <strong>{t("modules.listenSpeak.label")}</strong> —{" "}
              {t("modules.listenSpeak.body")}
            </li>
          </ul>
        </section>
        {session?.user ? (
          <p className={mx(styles, "legal-note")}>
            {t.rich("fullGuide", {
              link: (chunks) => <Link href="/getting-started">{chunks}</Link>,
            })}
          </p>
        ) : (
          <p className={mx(styles, "legal-note")}>
            {t.rich("signInHint", {
              link: (chunks) => <Link href="/sign-in">{chunks}</Link>,
            })}
          </p>
        )}
      </article>
    </PublicPageShell>
  );
}
