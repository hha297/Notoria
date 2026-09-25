import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ListeningView } from "@/components/listening/listening-view";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFolder } from "@/lib/actions/folders";
import { getActiveWorkspace } from "@/lib/workspace";

export async function ListeningLibrary({ folderId }: { folderId?: string }) {
  const [t, workspace] = await Promise.all([
    getTranslations("listening"),
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

  if (folderId) {
    const folder = await getFolder(folderId, "listening");
    if (!folder) {
      notFound();
    }
  }

  return (
    <ListeningView
      currentFolderId={folderId ?? null}
      workspaceId={workspace.id}
    />
  );
}
