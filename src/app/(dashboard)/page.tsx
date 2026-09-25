import { getTranslations } from "next-intl/server";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getRecentActivity } from "@/lib/activity/feed";
import { getSession } from "@/lib/auth/session";
import {
  countPracticeReadyWords,
  getDashboardContinueItems,
} from "@/lib/dashboard/activity";
import { getWorkspaceLearningStreak } from "@/lib/billing/coach";
import { getWorkspaceActivitySnapshot } from "@/lib/onboarding/snapshot";
import {
  countUnprocessedInboxItems,
} from "@/lib/actions/study-inbox";
import { getReviewLaterItems } from "@/lib/actions/review-later";
import { getLatestLearningNote } from "@/lib/writing/learning-notes";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const [t, workspace, session] = await Promise.all([
    getTranslations("dashboard"),
    getActiveWorkspace(),
    getSession(),
  ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("overview")}
          title={t("your")}
          highlight={t("workspaceLabel")}
          description={t("description")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  const userId = session?.user?.id;
  const [
    snapshot,
    practiceReadyWords,
    continueItems,
    streak,
    inboxCount,
    reviewLaterItems,
    recentActivity,
    latestLearningNote,
  ] = await Promise.all([
    getWorkspaceActivitySnapshot(workspace.id),
    countPracticeReadyWords(workspace.id),
    getDashboardContinueItems(workspace.id),
    userId
      ? getWorkspaceLearningStreak({
          userId,
          workspaceId: workspace.id,
        })
      : Promise.resolve(null),
    countUnprocessedInboxItems(workspace.id),
    getReviewLaterItems(5),
    userId
      ? getRecentActivity({
          userId,
          workspaceId: workspace.id,
          limit: 8,
        })
      : Promise.resolve([]),
    getLatestLearningNote(workspace.id),
  ]);

  return (
    <PageShell>
      <DashboardHome
        userName={session?.user?.name ?? "there"}
        snapshot={snapshot}
        practiceReadyCount={practiceReadyWords}
        continueItems={continueItems}
        streak={streak}
        inboxUnprocessedCount={inboxCount}
        reviewLaterItems={reviewLaterItems.map((item) => ({
          id: item.id,
          title: item.title,
          href: item.href,
          entityType: item.entityType,
        }))}
        recentActivity={recentActivity.map((item) => ({
          id: item.id,
          verb: item.verb,
          entityType: item.entityType,
          title: item.title,
          href: item.href,
          createdAt: item.createdAt.toISOString(),
        }))}
        latestLearningNote={
          latestLearningNote
            ? {
                id: latestLearningNote.id,
                title: latestLearningNote.title,
                href: latestLearningNote.href,
              }
            : null
        }
      />
    </PageShell>
  );
}
