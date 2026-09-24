import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PremiumCheckoutButton } from "@/components/billing/premium-checkout-button";
import { CoachAskPanel } from "@/components/coach/coach-ask-panel";
import { CoachProgressChart } from "@/components/coach/coach-progress-chart";
import { CoachProgressControls } from "@/components/coach/coach-progress-controls";
import { CoachRefreshButton } from "@/components/coach/coach-refresh-button";
import { CoachStreakCard } from "@/components/coach/coach-streak-card";
import { PageShell } from "@/components/layout/page-shell";
import styles from "@/components/style/coach/coach.module.css";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getLearningCoach } from "@/lib/billing/coach";
import { buildCoachSuggestedPrompts } from "@/lib/billing/coach-chat";
import type { CoachRecommendationType } from "@/lib/billing/coach-model";
import {
  buildAttentionItems,
  buildWhyEvidence,
  nextMoveEvidenceChips,
  parseCoachChartMetric,
  parseCoachProgressPeriod,
  primaryPracticeHref,
  progressAskQuestion,
  recommendationTitleKey,
} from "@/lib/billing/coach-progress";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";
import { getActiveWorkspace } from "@/lib/workspace";

const FOCUS_I18N: Record<CoachRecommendationType, string> = {
  flashcard_review: "focus.review-due",
  weak_words: "focus.weak-words",
  listening: "focus.listening",
  speaking: "focus.speaking",
  writing: "focus.writing",
  theory: "focus.theory",
  keep_going: "focus.keep-going",
};

const ACTIVITY_LABEL: Record<string, string> = {
  flashcardReviews: "reviews",
  againOrHard: "misses",
  listeningLessons: "listening",
  speakingSessions: "speaking",
  writingDocuments: "writing",
  theoryNotes: "theory",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoachPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const periodDays = parseCoachProgressPeriod(params.period);
  const chartMetric = parseCoachChartMetric(params.metric);
  const askSeed =
    typeof params.ask === "string" ? params.ask.slice(0, 500) : null;

  const [t, user, workspace] = await Promise.all([
    getTranslations("coach"),
    getCurrentUserRecord(),
    getActiveWorkspace(),
  ]);

  if (!user || !workspace) {
    return (
      <PageShell className="writing-atelier-shell coach-atelier-shell">
        <div
          className={cn(
            "writing-atelier coach-atelier",
            mx(styles, "coach-atelier flex flex-col gap-10"),
          )}
        >
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
          </header>
        </div>
      </PageShell>
    );
  }

  const result = await getLearningCoach({
    user,
    workspaceId: workspace.id,
    language: workspace.language,
    periodDays,
    chartMetric,
  });

  if (!result.ok) {
    return (
      <PageShell className="writing-atelier-shell coach-atelier-shell">
        <div
          className={cn(
            "writing-atelier coach-atelier",
            mx(styles, "coach-atelier flex flex-col gap-8"),
          )}
        >
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">
                {t("title")}{" "}
                <span className="text-[color:var(--accent-lime)]">{t("highlight")}</span>
              </h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
          </header>
          <hr className={mx(styles, "coach-rule")} />
          <div className={mx(styles, "coach-locked")}>
            <p className={mx(styles, "coach-locked-copy")}>{t("lockedBody")}</p>
            <p className={mx(styles, "coach-distinction")}>{t("distinction")}</p>
            <PremiumCheckoutButton />
          </div>
        </div>
      </PageShell>
    );
  }

  const { snapshot, note, progress } = result;
  const primary = snapshot.recommendations[0];
  const why = buildWhyEvidence(snapshot);
  const chips = nextMoveEvidenceChips(snapshot);
  const attention = buildAttentionItems(snapshot);
  const practiceHref = primaryPracticeHref(snapshot);
  const askAboutProgress = progressAskQuestion(progress.notices);
  const seriesSum = progress.series.points.reduce((sum, p) => sum + p.value, 0);
  const activityMax = Math.max(
    1,
    ...Object.values(progress.current).map((n) => n),
  );

  function whyLabel(code: string) {
    if (code.startsWith("due:")) {
      return t("why.due", { count: Number(code.slice(4)) });
    }
    if (code.startsWith("weak:")) {
      return t("why.weak", { count: Number(code.slice(5)) });
    }
    if (code.startsWith("reviews7d:")) {
      return t("why.reviews", { count: Number(code.slice(10)) });
    }
    if (code.startsWith("focus:")) {
      const type = code.slice(6) as CoachRecommendationType;
      return t("why.focus", {
        focus: t(FOCUS_I18N[type] as "focus.keep-going"),
      });
    }
    if (code === "speaking_idle") return t("why.speakingIdle");
    if (code === "listening_idle") return t("why.listeningIdle");
    if (code === "writing_idle") return t("why.writingIdle");
    if (code === "theory_idle") return t("why.theoryIdle");
    return code;
  }

  function chipLabel(id: string, value: number | string) {
    if (id === "due") return t("chips.due", { count: Number(value) });
    if (id === "weak") return t("chips.weak", { count: Number(value) });
    if (id === "speaking_idle") return t("chips.speakingIdle");
    if (id === "mastered") return t("chips.mastered", { count: Number(value) });
    return String(value);
  }

  function noticeText(code: string) {
    return t(`notices.${code}` as "notices.getting_started");
  }

  return (
    <PageShell className="writing-atelier-shell coach-atelier-shell">
      <div
        className={cn(
          "writing-atelier coach-atelier",
          mx(styles, "coach-atelier flex flex-col gap-10 lg:gap-12"),
        )}
      >
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">
              {t("title")}{" "}
              <span className="text-[color:var(--accent-lime)]">{t("highlight")}</span>
            </h1>
            <p className="writing-brand-lede">{t("descriptionIntelligence")}</p>
          </div>
          <div className={mx(styles, "coach-hero-actions")}>
            <CoachRefreshButton />
          </div>
        </header>

        <hr className={mx(styles, "coach-rule")} />

        {/* 1. Your next move */}
        <section
          className={mx(styles, "coach-section coach-next")}
          aria-labelledby="coach-next-heading"
        >
          <div>
            <p className={mx(styles, "coach-section-label")}>{t("next.label")}</p>
            <h2 className={mx(styles, "coach-section-title")} id="coach-next-heading">
              {t("next.title")}
            </h2>
          </div>

          <div className={mx(styles, "coach-next-card")}>
            {primary ? (
              <p className={mx(styles, "coach-next-headline")}>
                {t(recommendationTitleKey(primary.type) as "focus.keep-going")}
              </p>
            ) : null}
            <p className={mx(styles, "coach-next-body")}>{note}</p>

            {chips.length > 0 ? (
              <ul className={mx(styles, "coach-evidence")}>
                {chips.map((chip) => (
                  <li key={chip.id} className={mx(styles, "coach-evidence-chip")}>
                    {chipLabel(chip.id, chip.value)}
                  </li>
                ))}
              </ul>
            ) : null}

            {why.length > 0 ? (
              <div className={mx(styles, "coach-why")}>
                <p className={mx(styles, "coach-why-title")}>{t("why.title")}</p>
                <ol className={mx(styles, "coach-why-list")}>
                  {why.map((code, index) => (
                    <li key={code}>
                      <span className={mx(styles, "coach-why-index")} aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={mx(styles, "coach-why-text")}>
                        {whyLabel(code)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {snapshot.practicePlan.length > 0 ? (
              <div className={mx(styles, "coach-today-plan")}>
                <p className={mx(styles, "coach-section-kicker")}>{t("next.planTitle")}</p>
                <ol className={mx(styles, "coach-plan coach-plan-compact")}>
                  {snapshot.practicePlan.map((step, index) => (
                    <li key={step.type} className={mx(styles, "coach-plan-item")}>
                      <span className={mx(styles, "coach-plan-index")} aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={mx(styles, "coach-plan-copy")}>
                        <p className={mx(styles, "coach-plan-title")}>
                          {t(FOCUS_I18N[step.type] as "focus.keep-going")}
                        </p>
                        <p className={mx(styles, "coach-plan-detail")}>
                          {step.detail} · {t("planMinutes", { count: step.estimatedMinutes })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className={mx(styles, "coach-why-order")}>{t("next.whyOrder")}</p>
              </div>
            ) : null}

            <Link href={practiceHref} className={mx(styles, "coach-plan-start")}>
              {t("next.cta")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* 2. Ask your Learning Coach — full-width primary surface */}
        <div className={mx(styles, "coach-ask-stage")}>
          <aside
            className={mx(styles, "coach-quick coach-quick-bar")}
            aria-labelledby="coach-quick-heading"
          >
            <div className={mx(styles, "coach-quick-bar-head")}>
              <p className={mx(styles, "coach-section-label")} id="coach-quick-heading">
                {t("quick.label")}
              </p>
              <h2 className={mx(styles, "coach-quick-bar-title")}>{t("quick.title")}</h2>
            </div>
            <dl className={mx(styles, "coach-quick-list coach-quick-list-inline")}>
              <div>
                <dt>{t("language")}</dt>
                <dd>{snapshot.language}</dd>
              </div>
              <div>
                <dt>{t("vocabulary")}</dt>
                <dd>{snapshot.vocabularyTotal}</dd>
              </div>
              <div>
                <dt>{t("status.MASTERED")}</dt>
                <dd>{snapshot.vocabulary.MASTERED}</dd>
              </div>
              <div>
                <dt>{t("chips.dueLabel")}</dt>
                <dd>{snapshot.dueCards}</dd>
              </div>
              <div>
                <dt>{t("chips.weakLabel")}</dt>
                <dd>{snapshot.weakWords.length}</dd>
              </div>
            </dl>
          </aside>

          <CoachAskPanel
            suggestedPrompts={buildCoachSuggestedPrompts(snapshot)}
            emptyContext={snapshot.empty}
            seedQuestion={askSeed}
          />
        </div>

        {/* 3. Your progress */}
        <section
          className={mx(styles, "coach-section")}
          aria-labelledby="coach-progress-heading"
        >
          <div>
            <p className={mx(styles, "coach-section-label")}>{t("progress.label")}</p>
            <h2
              className={mx(styles, "coach-section-title")}
              id="coach-progress-heading"
            >
              {t("progress.title")}
            </h2>
            <p className={mx(styles, "coach-ask-lede")}>{t("progress.description")}</p>
          </div>

          <Suspense fallback={null}>
            <CoachProgressControls
              periodDays={progress.periodDays}
              metric={progress.series.metric}
            />
          </Suspense>

          <div className={mx(styles, "coach-progress-body")}>
          {!progress.historyAvailable ? (
            <div className={mx(styles, "coach-progress-main")}>
              <p className={mx(styles, "coach-empty")}>{t("progress.empty")}</p>
              <CoachStreakCard streak={progress.streak} />
            </div>
          ) : (
            <>
              <div className={mx(styles, "coach-progress-main")}>
                {progress.series.points.length > 0 && seriesSum > 0 ? (
                  <CoachProgressChart
                    points={progress.series.points}
                    metric={progress.series.metric}
                    label={t(`progress.metrics.${progress.series.metric}`)}
                    description={t("progress.chartSr", {
                      metric: t(`progress.metrics.${progress.series.metric}`),
                      days: progress.periodDays,
                      from: progress.series.points[0]?.value ?? 0,
                      to:
                        progress.series.points[
                          progress.series.points.length - 1
                        ]?.value ?? 0,
                    })}
                  />
                ) : (
                  <div className={mx(styles, "coach-chart")}>
                    <p className={mx(styles, "coach-empty")}>
                      {t("progress.chartEmpty")}
                    </p>
                  </div>
                )}
                <CoachStreakCard streak={progress.streak} />
              </div>

              <div className={mx(styles, "coach-progress-lower")}>
                <div className={mx(styles, "coach-activity")}>
                  <p className={mx(styles, "coach-section-kicker")}>
                    {t("progress.activityTitle", { days: progress.periodDays })}
                  </p>
                  <ul className={mx(styles, "coach-activity-bars")}>
                    {(
                      Object.entries(progress.current) as Array<
                        [keyof typeof progress.current, number]
                      >
                    )
                      .filter(([, value]) => value > 0)
                      .map(([key, value]) => (
                        <li key={key} className={mx(styles, "coach-activity-row")}>
                          <span className={mx(styles, "coach-activity-label")}>
                            {t(ACTIVITY_LABEL[key] as "reviews")}
                          </span>
                          <span
                            className={mx(styles, "coach-activity-track")}
                            aria-hidden
                          >
                            <span
                              className={mx(styles, "coach-activity-fill")}
                              style={{
                                width: `${Math.max(8, (value / activityMax) * 100)}%`,
                              }}
                            />
                          </span>
                          <span className={mx(styles, "coach-activity-count")}>
                            {value}
                          </span>
                        </li>
                      ))}
                  </ul>
                  <p className={mx(styles, "coach-activity-note")}>
                    {t("progress.activityNote")}
                  </p>
                </div>

                <ul
                  className={mx(styles, "coach-compare coach-compare-stack")}
                  aria-label={t("progress.compareLabel")}
                >
                  {progress.comparisons.map((row) => (
                    <li key={row.key} className={mx(styles, "coach-compare-item")}>
                      <span className={mx(styles, "coach-compare-label")}>
                        {t(ACTIVITY_LABEL[row.key] as "reviews")}
                      </span>
                      <span className={mx(styles, "coach-compare-values")}>
                        <span>{row.previous}</span>
                        <span aria-hidden> → </span>
                        <span>{row.current}</span>
                        <span
                          className={cn(
                            mx(styles, "coach-compare-delta"),
                            row.delta > 0 && mx(styles, "is-up"),
                            row.delta < 0 && mx(styles, "is-down"),
                          )}
                        >
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={mx(styles, "coach-notices")}>
                <p className={mx(styles, "coach-section-kicker")}>
                  {t("progress.noticesTitle")}
                </p>
                <ol className={mx(styles, "coach-notice-list")}>
                  {progress.notices.map((code, index) => (
                    <li key={code}>
                      <span className={mx(styles, "coach-notice-index")} aria-hidden>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={mx(styles, "coach-notice-text")}>
                        {noticeText(code)}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={`/coach?period=${progress.periodDays}&metric=${progress.series.metric}&ask=${encodeURIComponent(askAboutProgress)}#coach-ask`}
                  className={mx(styles, "coach-notice-cta")}
                  scroll={false}
                >
                  {t("progress.askAbout")}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </>
          )}
          </div>
        </section>

        {/* 4. What needs attention */}
        {attention.length > 0 ? (
          <section
            className={mx(styles, "coach-section")}
            aria-labelledby="coach-attention-heading"
          >
            <div>
              <p className={mx(styles, "coach-section-label")}>
                {t("attention.label")}
              </p>
              <h2
                className={mx(styles, "coach-section-title")}
                id="coach-attention-heading"
              >
                {t("attention.title")}
              </h2>
            </div>
            <ul className={mx(styles, "coach-attention")}>
              {attention.map((item) => (
                <li key={item.id} className={mx(styles, "coach-attention-item")}>
                  <div>
                    <p className={mx(styles, "coach-attention-title")}>
                      {item.id === "due"
                        ? t("attention.dueTitle", {
                            count: item.detail.dueCards ?? 0,
                          })
                        : item.id === "weak"
                          ? t("attention.weakTitle", {
                              count: item.detail.weakCount ?? 0,
                            })
                          : t(FOCUS_I18N[item.type] as "focus.keep-going")}
                    </p>
                    <p className={mx(styles, "coach-attention-body")}>
                      {item.id === "due"
                        ? t("attention.dueBody")
                        : item.id === "weak"
                          ? t("attention.weakBody", {
                              words: (item.detail.weakWords ?? []).join(" · "),
                            })
                          : item.id === "speaking"
                            ? t("hintSpeaking")
                            : t("hintListening")}
                    </p>
                  </div>
                  <Link href={item.href} className={mx(styles, "coach-inline-link")}>
                    {item.id === "due"
                      ? t("attention.review")
                      : item.id === "weak"
                        ? t("attention.practice")
                        : t("startStep")}
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
