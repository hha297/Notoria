import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { TheoryLibrary } from "@/components/theory/theory-library";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getTheoryNotes } from "@/lib/actions/theory";
import { toTheoryListItem } from "@/lib/theory/content";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function TheoryPage() {
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

  const notes = await getTheoryNotes();

  return (
    <TheoryLibrary notes={notes.map((note) => toTheoryListItem(note))} />
  );
}
