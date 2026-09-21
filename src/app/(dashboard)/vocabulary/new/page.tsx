import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function NewVocabularyPage() {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
        <div className="space-y-6">
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Link>
          <PageHeader
            eyebrow={t("title")}
            title={t("addWord")}
            highlight={t("addWordHighlight")}
            description={t("disabledNoWorkspace")}
          />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-1 sm:space-y-6 sm:pt-2">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        {t("backToList")}
      </Link>
      <VocabularyForm
        workspaceId={workspace.id}
        language={workspace.language}
      />
    </div>
  );
}
