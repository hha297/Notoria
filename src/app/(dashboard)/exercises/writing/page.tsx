import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { WritingExerciseEditor } from "@/components/exercises/writing-exercise-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WritingExercisePage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-4xl space-y-10 pt-2">
        <div className="space-y-6">
          <Link href="/exercises" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
            <ArrowLeft className="size-4" />{t("backToStudio")}
          </Link>
          <PageHeader eyebrow={t("title")} title={t("types.writing.label")} highlight={t("editor")} description={t("noWorkspace")} />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link href="/exercises" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink">
          <ArrowLeft className="size-4" />{t("backToStudio")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("types.writing.label")}
          highlight={t("editor")}
          description={t("types.writing.pageDescription")}
        />
      </div>
      <WritingExerciseEditor exerciseType="WRITING" />
    </div>
  );
}
