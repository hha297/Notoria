import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { TheoryLibrary } from "@/components/theory/theory-library";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFolder, getFolders } from "@/lib/actions/folders";
import { getTheoryNotes } from "@/lib/actions/theory";
import { toTheoryListItem } from "@/lib/theory/content";
import { getActiveWorkspace } from "@/lib/workspace";

export async function TheoryLibraryPage({ folderId }: { folderId?: string }) {
  const t = await getTranslations("theory");
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

  if (folderId) {
    const folder = await getFolder(folderId, "theory");
    if (!folder) notFound();
  }

  const [notes, folders] = await Promise.all([
    getTheoryNotes(),
    getFolders("theory"),
  ]);

  return (
    <TheoryLibrary
      notes={notes.map((note) => toTheoryListItem(note))}
      folders={folders}
      currentFolderId={folderId ?? null}
    />
  );
}
