import { getTranslations } from "next-intl/server";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getSession } from "@/lib/auth/session";
import {
  countPracticeReadyWords,
  getDashboardContinueItems,
} from "@/lib/dashboard/activity";
import { getWorkspaceLearningStreak } from "@/lib/billing/coach";
import { getWorkspaceActivitySnapshot } from "@/lib/onboarding/snapshot";
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
  const [snapshot, practiceReadyWords, continueItems, streak] =
    await Promise.all([
      getWorkspaceActivitySnapshot(workspace.id),
      countPracticeReadyWords(workspace.id),
      getDashboardContinueItems(workspace.id),
      userId
        ? getWorkspaceLearningStreak({
            userId,
            workspaceId: workspace.id,
          })
        : Promise.resolve(null),
    ]);

  return (
    <PageShell>
      <DashboardHome
        userName={session?.user?.name ?? "there"}
        snapshot={snapshot}
        practiceReadyCount={practiceReadyWords}
        continueItems={continueItems}
        streak={streak}
      />
    </PageShell>
  );
}
