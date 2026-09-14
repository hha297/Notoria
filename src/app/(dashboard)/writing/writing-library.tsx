import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { WritingView } from "@/components/writing/writing-view";
import { getFolder } from "@/lib/actions/folders";
import { getActiveWorkspace } from "@/lib/workspace";

export async function WritingLibrary({ folderId }: { folderId?: string }) {
  const [t, workspace] = await Promise.all([
    getTranslations("writing"),
    getActiveWorkspace(),
  ]);

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("studio")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  if (folderId) {
    const folder = await getFolder(folderId, "writing");
    if (!folder) {
      notFound();
    }
  }

  return (
    <WritingView
      currentFolderId={folderId ?? null}
      workspaceId={workspace.id}
    />
  );
}
