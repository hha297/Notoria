import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PremiumCheckoutButton } from "@/components/billing/premium-checkout-button";
import { CoachRefreshButton } from "@/components/coach/coach-refresh-button";
import { PageShell } from "@/components/layout/page-shell";
import styles from "@/components/style/coach/coach.module.css";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getLearningCoach } from "@/lib/billing/coach";
import {
  VOCAB_STATUSES,
  type CoachRecommendation,
  type CoachRecommendationType,
  type CoachSnapshot,
  type CoachWeekActivity,
} from "@/lib/billing/coach-model";
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

const WEEK_ROWS = [
  ["reviews", "flashcardReviews"],
  ["misses", "againOrHard"],
  ["listening", "listeningLessons"],
  ["speaking", "speakingSessions"],
  ["writing", "writingDocuments"],
  ["theory", "theoryNotes"],
] as const;

const TREND_LABEL: Record<keyof CoachWeekActivity, string> = {
  flashcardReviews: "reviews",
  againOrHard: "misses",
  listeningLessons: "listening",
  speakingSessions: "speaking",
  writingDocuments: "writing",
  theoryNotes: "theory",
};

const PATH_LABELS = ["pathCurrent", "pathNext", "pathThen", "pathLater"] as const;

function actionHint(
  item: CoachRecommendation,
  snapshot: CoachSnapshot,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (item.type === "flashcard_review" && snapshot.dueCards > 0) {
    return t("due", { count: snapshot.dueCards });
  }
  if (item.type === "weak_words" && snapshot.weakWords.length > 0) {
    return t("weakShort", { words: snapshot.weakWords.slice(0, 3).join(" · ") });
  }
  if (item.type === "speaking") return t("hintSpeaking");
  if (item.type === "listening") return t("hintListening");
  if (item.type === "writing") return t("hintWriting");
  if (item.type === "theory") return t("hintTheory");
  return null;
}

export default async function CoachPage() {
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

  const { snapshot, note } = result;
  const primary = snapshot.recommendations[0];
  const planMinutes = snapshot.practicePlan.reduce(
    (sum, step) => sum + step.estimatedMinutes,
    0,
  );

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
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
          <div className={mx(styles, "coach-hero-actions")}>
            <CoachRefreshButton />
          </div>
        </header>

        <hr className={mx(styles, "coach-rule")} />

        <section className={mx(styles, "coach-section")} aria-labelledby="coach-note-heading">
          <p className={mx(styles, "coach-section-label")} id="coach-note-heading">
            {t("focusLabel")}
          </p>
          <div className={mx(styles, "coach-note")}>
            <p className={mx(styles, "coach-note-text")}>{note}</p>
            {primary && !snapshot.empty ? (
              <div className={mx(styles, "coach-note-cta")}>
                <p className={mx(styles, "coach-note-focus")}>
                  {t(FOCUS_I18N[primary.type] as "focus.keep-going")}
                </p>
                <Link href={primary.href} className={mx(styles, "coach-inline-link")}>
                  {t("focusCta")}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {snapshot.empty ? (
          <section className={mx(styles, "coach-section")} aria-labelledby="coach-today-heading">
            <div>
              <p className={mx(styles, "coach-section-label")}>{t("today")}</p>
              <h2 className={mx(styles, "coach-section-title")} id="coach-today-heading">
                {t("todayTitle")}
              </h2>
            </div>
            <p className={mx(styles, "coach-empty")}>{t("empty")}</p>
            <ul className={mx(styles, "coach-actions")}>
              {snapshot.recommendations.map((item) => (
                <li key={item.type}>
                  <Link href={item.href} className={mx(styles, "coach-action")}>
                    <span className={mx(styles, "coach-action-copy")}>
                      <span className={mx(styles, "coach-action-title")}>
                        {t(FOCUS_I18N[item.type] as "focus.keep-going")}
                      </span>
                    </span>
                    <span className={mx(styles, "coach-action-mark")} aria-hidden>
                      <ArrowUpRight className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            <section className={mx(styles, "coach-section")} aria-labelledby="coach-profile-heading">
              <div>
                <p className={mx(styles, "coach-section-label")}>{t("profile")}</p>
                <h2 className={mx(styles, "coach-section-title")} id="coach-profile-heading">
                  {t("profileTitle")}
                </h2>
              </div>
              <div className={mx(styles, "coach-profile")}>
                <div className={mx(styles, "coach-profile-meta")}>
                  <div className={mx(styles, "coach-meta-item")}>
                    <p className={mx(styles, "coach-meta-label")}>{t("language")}</p>
                    <p className={mx(styles, "coach-meta-value")}>{snapshot.language}</p>
                  </div>
                </div>
                <div>
                  <p className={mx(styles, "coach-meta-label")}>{t("vocabulary")}</p>
                  {snapshot.vocabularyTotal > 0 ? (
                    <div className={mx(styles, "coach-vocab")} role="list">
                      {VOCAB_STATUSES.map((status) => (
                        <div key={status} className={mx(styles, "coach-vocab-item")} role="listitem">
                          <span className={mx(styles, "coach-vocab-count")}>
                            {snapshot.vocabulary[status]}
                          </span>
                          <span className={mx(styles, "coach-vocab-label")}>
                            {t(`status.${status}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={mx(styles, "coach-empty")}>{t("vocabularyEmpty")}</p>
                  )}
                </div>
              </div>
            </section>

            <section className={mx(styles, "coach-section")} aria-labelledby="coach-today-heading">
              <div>
                <p className={mx(styles, "coach-section-label")}>{t("today")}</p>
                <h2 className={mx(styles, "coach-section-title")} id="coach-today-heading">
                  {t("todayTitle")}
                </h2>
              </div>
              <ul className={mx(styles, "coach-actions")}>
                {snapshot.recommendations.map((item) => {
                  const hint = actionHint(item, snapshot, t);
                  return (
                    <li key={item.type}>
                      <Link href={item.href} className={mx(styles, "coach-action")}>
                        <span className={mx(styles, "coach-action-copy")}>
                          <span className={mx(styles, "coach-action-title")}>
                            {t(FOCUS_I18N[item.type] as "focus.keep-going")}
                          </span>
                          {hint ? (
                            <span className={mx(styles, "coach-action-hint")}>{hint}</span>
                          ) : null}
                        </span>
                        <span className={mx(styles, "coach-action-mark")} aria-hidden>
                          <ArrowUpRight className="size-4" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            {snapshot.practicePlan.length > 0 ? (
              <section className={mx(styles, "coach-section")} aria-labelledby="coach-plan-heading">
                <div>
                  <p className={mx(styles, "coach-section-label")}>{t("plan")}</p>
                  <h2 className={mx(styles, "coach-section-title")} id="coach-plan-heading">
                    {t("planTitle", { minutes: planMinutes })}
                  </h2>
                </div>
                <ol className={mx(styles, "coach-plan")}>
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
                      <Link href={step.href} className={mx(styles, "coach-inline-link")}>
                        {t("startStep")}
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ol>
                {snapshot.practicePlan[0] ? (
                  <Link
                    href={snapshot.practicePlan[0].href}
                    className={mx(styles, "coach-plan-start")}
                  >
                    {t("startPlan")}
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </section>
            ) : null}

            {snapshot.weakItems.length > 0 ? (
              <section className={mx(styles, "coach-section")} aria-labelledby="coach-mistakes-heading">
                <div>
                  <p className={mx(styles, "coach-section-label")}>{t("mistakes")}</p>
                  <h2 className={mx(styles, "coach-section-title")} id="coach-mistakes-heading">
                    {t("mistakesTitle")}
                  </h2>
                </div>
                <ul className={mx(styles, "coach-mistakes")}>
                  {snapshot.weakItems.map((item) => (
                    <li key={item.word} className={mx(styles, "coach-mistake")}>
                      <span className={mx(styles, "coach-mistake-word")}>{item.word}</span>
                      <span className={mx(styles, "coach-mistake-rating")}>
                        {t(`rating.${item.rating}`)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/exercises/flashcard?focus=weak"
                  className={mx(styles, "coach-plan-start")}
                >
                  {t("practiceMistakes")}
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </section>
            ) : null}

            {snapshot.path.length > 0 ? (
              <section className={mx(styles, "coach-section")} aria-labelledby="coach-path-heading">
                <div>
                  <p className={mx(styles, "coach-section-label")}>{t("path")}</p>
                  <h2 className={mx(styles, "coach-section-title")} id="coach-path-heading">
                    {t("pathTitle")}
                  </h2>
                </div>
                <ol className={mx(styles, "coach-path")}>
                  {snapshot.path.map((item, index) => (
                    <li key={item.type} className={mx(styles, "coach-path-item")}>
                      <p className={mx(styles, "coach-path-phase")}>
                        {t(PATH_LABELS[Math.min(index, PATH_LABELS.length - 1)])}
                      </p>
                      <p className={mx(styles, "coach-path-title")}>
                        {t(FOCUS_I18N[item.type] as "focus.keep-going")}
                      </p>
                      <p className={mx(styles, "coach-path-reason")}>{item.reason}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {snapshot.crossModule.length > 0 ? (
              <section className={mx(styles, "coach-section")} aria-labelledby="coach-cross-heading">
                <div>
                  <p className={mx(styles, "coach-section-label")}>{t("cross")}</p>
                  <h2 className={mx(styles, "coach-section-title")} id="coach-cross-heading">
                    {t("crossTitle")}
                  </h2>
                </div>
                <ul className={mx(styles, "coach-actions")}>
                  {snapshot.crossModule.map((hint) => (
                    <li key={hint.type}>
                      <Link href={hint.href} className={mx(styles, "coach-action")}>
                        <span className={mx(styles, "coach-action-copy")}>
                          <span className={mx(styles, "coach-action-title")}>
                            {t(`crossHints.${hint.type}`)}
                          </span>
                          <span className={mx(styles, "coach-action-hint")}>{hint.reason}</span>
                        </span>
                        <span className={mx(styles, "coach-action-mark")} aria-hidden>
                          <ArrowUpRight className="size-4" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className={mx(styles, "coach-section")} aria-labelledby="coach-week-heading">
              <div>
                <p className={mx(styles, "coach-section-label")}>{t("week")}</p>
                <h2 className={mx(styles, "coach-section-title")} id="coach-week-heading">
                  {t("weekTitle")}
                </h2>
              </div>
              <ul className={mx(styles, "coach-week-cards")}>
                {WEEK_ROWS.map(([labelKey, valueKey]) => (
                  <li key={valueKey} className={mx(styles, "coach-week-card")}>
                    <span className={mx(styles, "coach-week-value")}>
                      {snapshot.last7Days[valueKey]}
                    </span>
                    <span className={mx(styles, "coach-week-label")}>{t(labelKey)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={mx(styles, "coach-section")} aria-labelledby="coach-trends-heading">
              <div>
                <p className={mx(styles, "coach-section-label")}>{t("trends")}</p>
                <h2 className={mx(styles, "coach-section-title")} id="coach-trends-heading">
                  {t("trendsTitle")}
                </h2>
              </div>
              {snapshot.trendsAvailable ? (
                <ul className={mx(styles, "coach-trends")}>
                  {snapshot.trends.map((trend) => (
                    <li key={trend.key} className={mx(styles, "coach-trend")}>
                      <span className={mx(styles, "coach-trend-label")}>
                        {t(TREND_LABEL[trend.key])}
                      </span>
                      <span className={mx(styles, "coach-trend-values")}>
                        {trend.previous}
                        <span aria-hidden> → </span>
                        {trend.current}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={mx(styles, "coach-empty")}>{t("trendsEmpty")}</p>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
