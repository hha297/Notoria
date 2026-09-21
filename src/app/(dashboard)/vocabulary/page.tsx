import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { VocabularyView } from "@/components/vocabulary/vocabulary-view";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VocabularyPage() {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <PageShell className="vocab-lexicon-shell">
        <div className="vocab-lexicon writing-atelier writing-atelier-empty flex flex-col gap-10">
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("title")}</p>
              <h1 className="writing-brand-title">
                {t("title")}{" "}
                <span className="text-module-vocab-fg">{t("bank")}</span>
              </h1>
              <p className="writing-brand-lede">{t("disabledNoWorkspace")}</p>
            </div>
          </header>
          <NoWorkspaceEmpty />
        </div>
      </PageShell>
    );
  }

  return (
    <VocabularyView
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      language={workspace.language}
    />
  );
}
