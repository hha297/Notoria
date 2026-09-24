import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { buttonVariants } from "@/components/ui/button";
import legalStyles from "@/components/style/legal/legal.module.css";
import guideStyles from "@/components/style/legal/how-to-use.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "How to Use",
  description:
    "A calm public guide to Notoria’s learning loop — start small with a few words, then grow vocabulary, theory, practice, writing, listening, and speaking at your own pace.",
  alternates: { canonical: "https://www.notoria.fi/how-to-use" },
};

const LOOP_STAGES = [
  "bring",
  "organise",
  "understand",
  "practise",
  "use",
  "review",
] as const;

const FIRST_STEPS = [
  "workspace",
  "words",
  "notes",
  "practice",
  "return",
] as const;

const AREAS = [
  "vocab",
  "capture",
  "theory",
  "exercises",
  "writing",
  "listening",
  "speaking",
] as const;

export default async function HowToUsePage() {
  const t = await getTranslations("sitePages.howToUse");
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <PublicPageShell
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("lede")}
    >
      <article
        className={cn(
          mx(legalStyles, "legal-prose"),
          mx(guideStyles, "guide"),
        )}
      >
        <section>
          <h2>{t("intro.title")}</h2>
          <p>{t("intro.p1")}</p>
          <p>{t("intro.p2")}</p>
          <p className={mx(guideStyles, "guide-beat")}>{t("intro.beat")}</p>
        </section>

        <section>
          <h2>{t("loop.title")}</h2>
          <p>{t("loop.p1")}</p>
          <ol className={mx(guideStyles, "guide-loop")} aria-label={t("loop.title")}>
            {LOOP_STAGES.map((stage, index) => (
              <li key={stage} className={mx(guideStyles, "guide-loop-item")}>
                <span className={mx(guideStyles, "guide-loop-index")} aria-hidden>
                  {index + 1}
                </span>
                <div className={mx(guideStyles, "guide-loop-copy")}>
                  <p className={mx(guideStyles, "guide-loop-label")}>
                    {t(`loop.stages.${stage}.label`)}
                  </p>
                  <p className={mx(guideStyles, "guide-loop-body")}>
                    {t(`loop.stages.${stage}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className={mx(guideStyles, "guide-beat")}>{t("loop.beat")}</p>
        </section>

        <section>
          <h2>{t("startSmall.title")}</h2>
          <p>{t("startSmall.p1")}</p>
          <p>{t("startSmall.p2")}</p>
        </section>

        <section>
          <h2>{t("firstSession.title")}</h2>
          <p>{t("firstSession.intro")}</p>
          <ol className={mx(guideStyles, "guide-steps")}>
            {FIRST_STEPS.map((step, index) => (
              <li key={step} className={mx(guideStyles, "guide-step")}>
                <span className={mx(guideStyles, "guide-step-index")} aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <p className={mx(guideStyles, "guide-step-title")}>
                    {t(`firstSession.steps.${step}.title`)}
                  </p>
                  <p className={mx(guideStyles, "guide-step-body")}>
                    {t(`firstSession.steps.${step}.body`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>{t("connect.title")}</h2>
          <p>{t("connect.p1")}</p>
          <p>{t("connect.p2")}</p>
          <p>{t("connect.p3")}</p>
          <p className={mx(guideStyles, "guide-beat")}>{t("connect.beat")}</p>
        </section>

        <section>
          <h2>{t("areas.title")}</h2>
          <p>{t("areas.intro")}</p>
          <div className={mx(guideStyles, "guide-areas")}>
            {AREAS.map((area) => (
              <article
                key={area}
                className={mx(guideStyles, "guide-area")}
                data-area={area}
              >
                <h3 className={mx(guideStyles, "guide-area-title")}>
                  {t(`areas.${area}.label`)}
                </h3>
                <p className={mx(guideStyles, "guide-area-body")}>
                  {t(`areas.${area}.body`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>{t("notEverything.title")}</h2>
          <p>{t("notEverything.p1")}</p>
          <p>{t("notEverything.p2")}</p>
        </section>

        <section className={mx(guideStyles, "guide-cta")} aria-label={t("cta.title")}>
          <h2>{t("cta.title")}</h2>
          <p>{t("cta.body")}</p>
          <div className={mx(guideStyles, "guide-cta-actions")}>
            {signedIn ? (
              <>
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    mx(guideStyles, "guide-cta-link guide-cta-primary"),
                  )}
                >
                  {t("cta.openWorkspace")}
                </Link>
                <Link
                  href="/getting-started"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    mx(guideStyles, "guide-cta-link guide-cta-secondary"),
                  )}
                >
                  {t("cta.inAppGuide")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    mx(guideStyles, "guide-cta-link guide-cta-primary"),
                  )}
                >
                  {t("cta.createAccount")}
                </Link>
                <Link
                  href="/sign-in"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    mx(guideStyles, "guide-cta-link guide-cta-secondary"),
                  )}
                >
                  {t("cta.signIn")}
                </Link>
              </>
            )}
          </div>
          <p className={mx(guideStyles, "guide-cta-note")}>
            {signedIn
              ? t.rich("cta.signedInNote", {
                  link: (chunks) => (
                    <Link href="/getting-started">{chunks}</Link>
                  ),
                })
              : t.rich("cta.signedOutNote", {
                  link: (chunks) => <Link href="/sign-in">{chunks}</Link>,
                })}
          </p>
        </section>
      </article>
    </PublicPageShell>
  );
}
