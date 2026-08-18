import { getTranslations } from "next-intl/server";
import { DashboardContinue } from "@/components/dashboard/dashboard-continue";
import { DashboardGuide } from "@/components/dashboard/dashboard-guide";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { StatCard } from "@/components/layout/stat-card";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import {
  countPracticeReadyWords,
  getDashboardContinueItems,
} from "@/lib/dashboard/activity";
import { getWorkspaceActivitySnapshot } from "@/lib/onboarding/snapshot";
import { getLanguageName } from "@/lib/languages";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("overview")}
          title={t("your")}
          highlight={t("workspaceLabel")}
          description={t("description", { language: "—" })}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  const languageName = getLanguageName(workspace.language);
  const [snapshot, practiceReadyWords, continueItems] = await Promise.all([
    getWorkspaceActivitySnapshot(workspace.id),
    countPracticeReadyWords(workspace.id),
    getDashboardContinueItems(workspace.id),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("overview")}
        title={t("your")}
        highlight={t("workspaceLabel")}
        description={t("description", { language: languageName })}
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("wordsSaved")} value={snapshot.vocabularyCount} />
        <StatCard
          label={t("wordsReadyToPractice")}
          value={practiceReadyWords}
          featured
        />
        <StatCard label={t("theoryNotes")} value={snapshot.theoryCount} />
        <StatCard label={t("writingPieces")} value={snapshot.writingCount} />
      </div>

      <DashboardContinue
        items={continueItems}
        wordCount={snapshot.vocabularyCount}
        practiceReadyCount={practiceReadyWords}
      />

      <DashboardGuide
        snapshot={snapshot}
        wordCount={snapshot.vocabularyCount}
        practiceReadyCount={practiceReadyWords}
      />
    </PageShell>
  );
}
