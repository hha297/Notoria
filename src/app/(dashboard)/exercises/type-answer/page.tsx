import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TypeAnswerSession } from "@/components/exercises/type-answer-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function TypeAnswerPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl space-y-10 pt-2">
        <div className="space-y-6">
          <Link href="/exercises" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
            <ArrowLeft className="size-4" />{t("backToStudio")}
          </Link>
          <PageHeader eyebrow={t("title")} title={t("types.type-answer.label")} highlight={t("practice")} description={t("noWorkspace")} />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  const words = await getFlashcardWords();

  return (
    <div className="mx-auto max-w-5xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link href="/exercises" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          <ArrowLeft className="size-4" />{t("backToStudio")}
        </Link>
        <PageHeader eyebrow={t("title")} title={t("types.type-answer.label")} highlight={t("practice")} description={t("types.type-answer.description")} />
      </div>
      <TypeAnswerSession workspaceId={workspace.id} words={words} />
    </div>
  );
}
