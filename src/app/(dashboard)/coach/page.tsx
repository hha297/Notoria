import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PremiumCheckoutButton } from "@/components/billing/premium-checkout-button";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { getLearningCoach } from "@/lib/billing/coach";
import { getActiveWorkspace } from "@/lib/workspace";

const FOCUS_HREFS: Record<string, string> = {
  "review-due": "/exercises/flashcard",
  "weak-words": "/exercises/flashcard",
  listening: "/listening",
  speaking: "/speaking",
  "keep-going": "/vocabulary",
};

export default async function CoachPage() {
  const [t, user, workspace] = await Promise.all([
    getTranslations("coach"),
    getCurrentUserRecord(),
    getActiveWorkspace(),
  ]);

  if (!user || !workspace) {
    return (
      <PageShell>
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
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
      <PageShell>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("lockedTitle")}
          description={t("lockedBody")}
        />
        <PremiumCheckoutButton />
      </PageShell>
    );
  }

  const { snapshot, note } = result;
  const vocabSummary = Object.entries(snapshot.vocabulary)
    .map(([status, total]) => `${status} ${total}`)
    .join(" · ");

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="space-y-8">
        {note ? (
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-semibold text-ink">{t("noteLabel")}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-ink">{t("profile")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("language")}: {snapshot.language}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("level")}: {snapshot.recentSpeakingLevel ?? t("levelMissing")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("vocabulary")}: {vocabSummary || "0"}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-ink">{t("today")}</h2>
          <ul className="space-y-2 text-sm text-ink">
            {snapshot.focus.map((item) => (
              <li key={item}>
                <Link href={FOCUS_HREFS[item] ?? "/vocabulary"} className="underline-offset-4 hover:underline">
                  {t(`focus.${item}` as "focus.keep-going")}
                </Link>
              </li>
            ))}
            <li>{t("due", { count: snapshot.dueReviews })}</li>
            <li>
              {snapshot.weakWords.length > 0
                ? t("weak", { words: snapshot.weakWords.join(", ") })
                : t("noWeak")}
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-ink">{t("week")}</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              {t("reviews")}: {snapshot.last7Days.flashcardReviews}
            </li>
            <li>
              {t("misses")}: {snapshot.last7Days.againOrHard}
            </li>
            <li>
              {t("listening")}: {snapshot.last7Days.listeningLessons}
            </li>
            <li>
              {t("speaking")}: {snapshot.last7Days.speakingSessions}
            </li>
            <li>
              {t("writing")}: {snapshot.last7Days.writingDocuments}
            </li>
            <li>
              {t("theory")}: {snapshot.last7Days.theoryNotes}
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
