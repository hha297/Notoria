import type { CSSProperties } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BookOpenText,
  Compass,
  LogIn,
  Rocket,
  UserPlus,
} from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { LandingAmbient } from "@/components/landing/landing-ambient";
import { PublicHeader } from "@/components/landing/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import styles from "@/components/style/landing/landing.module.css";
import type { AppLocale } from "@/i18n/config";
import { mx } from "@/lib/css-module";

const WORKFLOW_KEYS = [
  "collect",
  "organise",
  "understand",
  "practise",
  "apply",
  "review",
] as const;

const FEATURE_SHOWCASE = [
  {
    key: "vocabulary",
    reverse: false,
    css: "--module-vocab-bg",
    fg: "--module-vocab-fg",
  },
  {
    key: "inbox",
    reverse: true,
    css: "--module-home-bg",
    fg: "--module-home-fg",
  },
  {
    key: "theory",
    reverse: false,
    css: "--module-theory-bg",
    fg: "--module-theory-fg",
  },
  {
    key: "exercises",
    reverse: true,
    css: "--module-exercise-bg",
    fg: "--module-exercise-fg",
  },
  {
    key: "skills",
    reverse: false,
    css: "--module-writing-bg",
    fg: "--module-writing-fg",
  },
  {
    key: "connected",
    reverse: true,
    css: "--module-listen-bg",
    fg: "--module-listen-fg",
  },
] as const;

const FAQ_GROUPS = [
  {
    key: "about",
    items: ["what", "onlyVocab", "who", "vsFlashcards"] as const,
  },
  {
    key: "features",
    items: [
      "vocabHow",
      "inboxWhy",
      "theoryExercises",
      "skillsSupported",
      "review",
    ] as const,
  },
  {
    key: "start",
    items: ["createAccount", "afterSignup", "chooseLanguage", "experience"] as const,
  },
  {
    key: "account",
    items: ["languages", "devices", "plans", "help"] as const,
  },
] as const;

const PHILOSOPHY_KEYS = [
  "workspace",
  "understand",
  "connect",
  "skills",
  "pace",
  "habits",
] as const;

const START_KEYS = [
  "account",
  "workspace",
  "language",
  "collect",
  "explore",
  "routine",
] as const;

export async function LandingPage() {
  const t = await getTranslations("sitePages.landing");
  const locale = (await getLocale()) as AppLocale;

  return (
    <div className={mx(styles, "landing")}>
      <LandingAmbient />
      <PublicHeader locale={locale} />

      <main>
        <section className={mx(styles, "hero")}>
          <div className={mx(styles, "landing-shell hero-grid")}>
            <div>
              <p className={mx(styles, "hero-brand")}>
                Noto<span>ria</span>
              </p>
              <h1 className={mx(styles, "hero-title")}>{t("hero.headline")}</h1>
              <p className={mx(styles, "hero-lede")}>{t("hero.description")}</p>
              <p className={mx(styles, "hero-lede")}>{t("hero.supporting")}</p>
              <div className={mx(styles, "cta-row")}>
                <LinkButton href="/sign-up" size="lg">
                  <Rocket aria-hidden />
                  {t("hero.primaryCta")}
                </LinkButton>
                <LinkButton href="#how-it-works" variant="outline" size="lg">
                  <Compass aria-hidden />
                  {t("hero.secondaryCta")}
                </LinkButton>
              </div>
            </div>

            <div className={mx(styles, "product-stage")}>
              <div
                className={mx(styles, "float-card")}
                style={
                  {
                    "--float-bg": "var(--module-vocab-bg)",
                    "--float-fg": "var(--module-vocab-fg)",
                  } as CSSProperties
                }
              >
                <strong>{t("preview.floatVocab")}</strong>
                <span>{t("preview.floatVocabMeta")}</span>
              </div>
              <div
                className={mx(styles, "float-card")}
                style={
                  {
                    "--float-bg": "var(--module-theory-bg)",
                    "--float-fg": "var(--module-theory-fg)",
                  } as CSSProperties
                }
              >
                <strong>{t("preview.floatTheory")}</strong>
                <span>{t("preview.floatTheoryMeta")}</span>
              </div>
              <div
                className={mx(styles, "float-card")}
                style={
                  {
                    "--float-bg": "var(--module-exercise-bg)",
                    "--float-fg": "var(--module-exercise-fg)",
                  } as CSSProperties
                }
              >
                <strong>{t("preview.floatPractice")}</strong>
                <span>{t("preview.floatPracticeMeta")}</span>
              </div>

              <div className={mx(styles, "mock-window")} aria-hidden>
                <div className={mx(styles, "mock-chrome")}>
                  <span className={mx(styles, "mock-dot")} />
                  <span className={mx(styles, "mock-dot")} />
                  <span className={mx(styles, "mock-dot")} />
                  <span className={mx(styles, "mock-chrome-label")}>
                    {t("preview.windowLabel")}
                  </span>
                </div>
                <div className={mx(styles, "mock-body")}>
                  <div className={mx(styles, "hero-preview-rail")}>
                    <div
                      className={mx(styles, "hero-tile")}
                      style={
                        {
                          "--tile-bg": "var(--module-vocab-bg)",
                          "--tile-fg": "var(--module-vocab-fg)",
                        } as CSSProperties
                      }
                    >
                      <strong>{t("preview.vocabTitle")}</strong>
                      <span>{t("preview.vocabMeta")}</span>
                    </div>
                    <div
                      className={mx(styles, "hero-tile")}
                      style={
                        {
                          "--tile-bg": "var(--module-theory-bg)",
                          "--tile-fg": "var(--module-theory-fg)",
                        } as CSSProperties
                      }
                    >
                      <strong>{t("preview.theoryTitle")}</strong>
                      <span>{t("preview.theoryMeta")}</span>
                    </div>
                    <div
                      className={mx(styles, "hero-tile")}
                      style={
                        {
                          "--tile-bg": "var(--module-exercise-bg)",
                          "--tile-fg": "var(--module-exercise-fg)",
                        } as CSSProperties
                      }
                    >
                      <strong>{t("preview.practiceTitle")}</strong>
                      <span>{t("preview.practiceMeta")}</span>
                    </div>
                  </div>
                  <div className={mx(styles, "hero-preview-main")}>
                    <p>{t("preview.cardKicker")}</p>
                    <strong>{t("preview.cardTitle")}</strong>
                    <p>{t("preview.cardBody")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={mx(styles, "section section-alt")}
        >
          <div className={mx(styles, "landing-shell")}>
            <p className={mx(styles, "kicker")}>{t("workflow.kicker")}</p>
            <h2 className={mx(styles, "title")}>{t("workflow.title")}</h2>
            <p className={mx(styles, "lede")}>{t("workflow.lede")}</p>
            <p className={mx(styles, "lede")}>{t("workflow.bridge")}</p>

            <ol className={mx(styles, "workflow-track")}>
              {WORKFLOW_KEYS.map((key, index) => (
                <li key={key} className={mx(styles, "workflow-node")}>
                  <div className={mx(styles, "workflow-marker")} aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className={mx(styles, "workflow-line")} aria-hidden />
                  <div className={mx(styles, "workflow-copy")}>
                    <h3>{t(`workflow.steps.${key}.title`)}</h3>
                    <p>{t(`workflow.steps.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Link href="/how-to-use" className={mx(styles, "section-link")}>
              {t("workflow.guideLink")}
            </Link>
          </div>
        </section>

        <section id="features" className={mx(styles, "section")}>
          <div className={mx(styles, "landing-shell")}>
            <p className={mx(styles, "kicker")}>{t("features.kicker")}</p>
            <h2 className={mx(styles, "title")}>{t("features.title")}</h2>
            <p className={mx(styles, "lede")}>{t("features.lede")}</p>

            <div className={mx(styles, "feature-rows")}>
              {FEATURE_SHOWCASE.map((item) => (
                <article
                  key={item.key}
                  className={mx(
                    styles,
                    item.reverse
                      ? "feature-row feature-row-reverse"
                      : "feature-row",
                  )}
                >
                  <div className={mx(styles, "feature-copy")}>
                    <p className={mx(styles, "kicker")}>
                      {t(`features.items.${item.key}.eyebrow`)}
                    </p>
                    <h3>{t(`features.items.${item.key}.title`)}</h3>
                    <p>{t(`features.items.${item.key}.body`)}</p>
                    <p>{t(`features.items.${item.key}.example`)}</p>
                  </div>
                  <div
                    className={mx(styles, "feature-visual")}
                    style={
                      {
                        "--feature-bg": `var(${item.css})`,
                        "--feature-fg": `var(${item.fg})`,
                      } as CSSProperties
                    }
                    aria-hidden
                  >
                    <div className={mx(styles, "mock-window")}>
                      <div className={mx(styles, "mock-chrome")}>
                        <span className={mx(styles, "mock-dot")} />
                        <span className={mx(styles, "mock-dot")} />
                        <span className={mx(styles, "mock-dot")} />
                        <span className={mx(styles, "mock-chrome-label")}>
                          {t(`features.items.${item.key}.previewLabel`)}
                        </span>
                      </div>
                      <div className={mx(styles, "mock-body")}>
                        <div className={mx(styles, "hero-preview-main")}>
                          <p>{t(`features.items.${item.key}.previewKicker`)}</p>
                          <strong>
                            {t(`features.items.${item.key}.previewTitle`)}
                          </strong>
                          <p>{t(`features.items.${item.key}.previewBody`)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={mx(styles, "section section-alt")}>
          <div className={mx(styles, "landing-shell philosophy")}>
            <div>
              <p className={mx(styles, "kicker")}>{t("philosophy.kicker")}</p>
              <h2 className={mx(styles, "title")}>{t("philosophy.title")}</h2>
              <p className={mx(styles, "lede")}>{t("philosophy.lede")}</p>
              <p className={mx(styles, "lede")}>{t("philosophy.expand")}</p>
              <div className={mx(styles, "philosophy-quote")}>
                <blockquote>{t("philosophy.beat")}</blockquote>
              </div>
              <div className={mx(styles, "section-links")}>
                <Link href="/about" className={mx(styles, "section-link")}>
                  {t("philosophy.aboutLink")}
                </Link>
                <Link href="/our-story" className={mx(styles, "section-link")}>
                  {t("philosophy.storyLink")}
                </Link>
              </div>
            </div>
            <ul className={mx(styles, "philosophy-list")}>
              {PHILOSOPHY_KEYS.map((key) => (
                <li key={key}>{t(`philosophy.points.${key}`)}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={mx(styles, "section")}>
          <div className={mx(styles, "landing-shell")}>
            <p className={mx(styles, "kicker")}>{t("gettingStarted.kicker")}</p>
            <h2 className={mx(styles, "title")}>{t("gettingStarted.title")}</h2>
            <p className={mx(styles, "lede")}>{t("gettingStarted.lede")}</p>
            <p className={mx(styles, "lede")}>{t("gettingStarted.expect")}</p>

            <ol className={mx(styles, "start-rail")}>
              {START_KEYS.map((key, index) => (
                <li key={key} className={mx(styles, "start-step")}>
                  <span className={mx(styles, "start-index")} aria-hidden>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{t(`gettingStarted.steps.${key}.title`)}</h3>
                    <p>{t(`gettingStarted.steps.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className={mx(styles, "cta-row")}>
              <LinkButton href="/sign-up" size="lg">
                <UserPlus aria-hidden />
                {t("gettingStarted.cta")}
              </LinkButton>
              <LinkButton href="/how-to-use" variant="outline" size="lg">
                <BookOpenText aria-hidden />
                {t("gettingStarted.secondaryCta")}
              </LinkButton>
            </div>
          </div>
        </section>

        <section id="faq" className={mx(styles, "section section-alt")}>
          <div className={mx(styles, "landing-shell")}>
            <p className={mx(styles, "kicker")}>{t("faq.kicker")}</p>
            <h2 className={mx(styles, "title")}>{t("faq.title")}</h2>
            <p className={mx(styles, "lede")}>{t("faq.lede")}</p>

            <div className={mx(styles, "faq-groups")}>
              {FAQ_GROUPS.map((group) => (
                <div key={group.key} className={mx(styles, "faq-group")}>
                  <h3 className={mx(styles, "faq-category")}>
                    {t(`faq.groups.${group.key}`)}
                  </h3>
                  <div className={mx(styles, "faq")}>
                    {group.items.map((item) => (
                      <details key={item}>
                        <summary>{t(`faq.items.${item}.q`)}</summary>
                        <p>
                          {t.rich(`faq.items.${item}.a`, {
                            signUp: (chunks) => (
                              <Link
                                href="/sign-up"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            signIn: (chunks) => (
                              <Link
                                href="/sign-in"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            gettingStarted: (chunks) => (
                              <Link
                                href="/getting-started"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            billing: (chunks) => (
                              <Link
                                href="/account"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            support: (chunks) => (
                              <Link
                                href="/support"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            contact: (chunks) => (
                              <Link
                                href="/contact"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                            site: (chunks) => (
                              <Link
                                href="https://www.notoria.fi"
                                className={mx(styles, "faq-inline-link")}
                              >
                                {chunks}
                              </Link>
                            ),
                          })}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Link href="/support" className={mx(styles, "section-link")}>
              {t("faq.supportLink")}
            </Link>
          </div>
        </section>

        <section className={mx(styles, "section")}>
          <div className={mx(styles, "landing-shell")}>
            <div className={mx(styles, "final-cta")}>
              <h2 className={mx(styles, "title")}>{t("finalCta.title")}</h2>
              <p className={mx(styles, "lede")}>{t("finalCta.lede")}</p>
              <div className={mx(styles, "cta-row")}>
                <LinkButton href="/sign-up" size="lg">
                  <Rocket aria-hidden />
                  {t("finalCta.primary")}
                </LinkButton>
                <LinkButton href="/sign-in" variant="outline" size="lg">
                  <LogIn aria-hidden />
                  {t("finalCta.secondary")}
                </LinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter variant="public" />
    </div>
  );
}
