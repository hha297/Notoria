import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function NewVocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string; note?: string; fromInbox?: string }>;
}) {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();
  const { prefill, note, fromInbox } = await searchParams;
  const word = prefill?.trim() || "";
  const notes = note?.trim() || "";
  const fromInboxId = fromInbox?.trim() || undefined;

  if (!workspace) {
    return (
      <PageShell className="vocab-lexicon-shell">
        <div className="vocab-lexicon writing-atelier writing-atelier-empty flex flex-col gap-8 lg:gap-10">
          <Link href="/vocabulary" className="writing-back">
            <ArrowLeft className="size-4 shrink-0" />
            {t("backToList")}
          </Link>
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("title")}</p>
              <h1 className="writing-brand-title">
                {t("addWord")}{" "}
                <span className="text-module-vocab-fg">{t("addWordHighlight")}</span>
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
    <PageShell className="vocab-lexicon-shell">
      <div className="vocab-lexicon writing-atelier flex flex-col gap-6 lg:gap-8">
        <Link href="/vocabulary" className="writing-back">
          <ArrowLeft className="size-4 shrink-0" />
          {t("backToList")}
        </Link>
        <VocabularyForm
          workspaceId={workspace.id}
          language={workspace.language}
          prefillWord={word || undefined}
          prefillNotes={notes || undefined}
          fromInboxId={fromInboxId}
        />
      </div>
    </PageShell>
  );
}
