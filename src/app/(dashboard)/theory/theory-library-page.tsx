import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { TheoryLibrary } from "@/components/theory/theory-library";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFolder } from "@/lib/actions/folders";
import { getActiveWorkspace } from "@/lib/workspace";

export async function TheoryLibraryPage({ folderId }: { folderId?: string }) {
  const [t, workspace] = await Promise.all([
    getTranslations("theory"),
    getActiveWorkspace(),
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

  if (folderId) {
    const folder = await getFolder(folderId, "theory");
    if (!folder) {
      notFound();
    }
  }

  return (
    <TheoryLibrary
      currentFolderId={folderId ?? null}
      workspaceId={workspace.id}
    />
  );
}
