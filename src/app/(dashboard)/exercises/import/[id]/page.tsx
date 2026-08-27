import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TheoryExerciseSessionView } from "@/components/exercises/theory-exercise-session";
import { PageHeader } from "@/components/layout/page-header";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getExerciseImport } from "@/lib/actions/exercise-import";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ImportExercisePracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl space-y-10 pt-2">
        <div className="space-y-6">
          <Link
            href="/exercises"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {t("backToStudio")}
          </Link>
          <PageHeader
            eyebrow={t("title")}
            title={t("import.practiceTitle")}
            highlight={t("practice")}
            description={t("noWorkspace")}
          />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  const detail = await getExerciseImport(id);
  if (!detail || detail.status !== "COMPLETED" || detail.exercises.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToStudio")}
        </Link>
        <PageHeader
          eyebrow={t("import.eyebrow")}
          title={detail.title}
          highlight={t("practice")}
          description={t("import.practiceDescription")}
        />
      </div>
      <TheoryExerciseSessionView
        practiceOnly
        session={{
          theoryId: detail.id,
          theoryTitle: detail.title,
          items: detail.exercises,
        }}
      />
    </div>
  );
}
