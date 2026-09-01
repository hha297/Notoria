import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { SpeakingLockedPage } from "@/components/speaking/speaking-locked";
import { SpeakingView } from "@/components/speaking/speaking-view";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getSpeakingSessions } from "@/lib/actions/speaking";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getActiveWorkspace } from "@/lib/workspace";

export async function SpeakingLibrary() {
  const [t, workspace, proAccess] = await Promise.all([
    getTranslations("speaking"),
    getActiveWorkspace(),
    getCurrentProAccess(),
  ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          highlight={t("highlight")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  if (!proAccess.hasProAccess) {
    return <SpeakingLockedPage />;
  }

  const sessions = await getSpeakingSessions();

  return <SpeakingView sessions={sessions} />;
}
