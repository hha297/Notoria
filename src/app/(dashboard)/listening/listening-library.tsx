import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ListeningView } from "@/components/listening/listening-view";
import { ListeningLockedPage } from "@/components/listening/listening-locked";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFolder, getFolders } from "@/lib/actions/folders";
import { getListeningLessons } from "@/lib/actions/listening";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { getActiveWorkspace } from "@/lib/workspace";

export async function ListeningLibrary({ folderId }: { folderId?: string }) {
  const t = await getTranslations("listening");
  const workspace = await getActiveWorkspace();

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

  const proAccess = await getCurrentProAccess();
  if (!proAccess.hasProAccess) {
    return <ListeningLockedPage />;
  }

  if (folderId) {
    const folder = await getFolder(folderId, "listening");
    if (!folder) notFound();
  }

  const [lessons, folders] = await Promise.all([
    getListeningLessons(),
    getFolders("listening"),
  ]);

  return (
    <ListeningView
      lessons={lessons}
      folders={folders}
      currentFolderId={folderId ?? null}
    />
  );
}
