import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { SpeakingView } from "@/components/speaking/speaking-view";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export async function SpeakingLibrary() {
  const [t, workspace] = await Promise.all([
    getTranslations("speaking"),
    getActiveWorkspace(),
  ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  return <SpeakingView workspaceId={workspace.id} />;
}
