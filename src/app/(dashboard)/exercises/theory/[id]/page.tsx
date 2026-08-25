import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TheoryExerciseSessionView } from "@/components/exercises/theory-exercise-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getTheoryNote } from "@/lib/actions/theory";
import { buildTheoryExerciseSession } from "@/lib/theory-exercises/build-session";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function TheoryExercisePracticePage({
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
            title={t("theory.practiceTitle")}
            highlight={t("practice")}
            description={t("noWorkspace")}
          />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  const note = await getTheoryNote(id);
  if (!note) notFound();

  const session = buildTheoryExerciseSession({
    theoryId: note.id,
    theoryTitle: note.title,
  });

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
          eyebrow={t("theory.eyebrow")}
          title={note.title}
          highlight={t("practice")}
          description={t("theory.practiceDescription")}
        />
      </div>
      <TheoryExerciseSessionView session={session} />
    </div>
  );
}
