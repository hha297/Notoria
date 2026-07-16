import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { WritingExerciseEditor } from "@/components/exercises/writing-exercise-editor";
import { getExerciseTypeBySlug } from "@/lib/exercise-types";
import { getExercise } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("exercises");
  const exerciseType = getExerciseTypeBySlug(id);

  if (exerciseType) {
    redirect(`/exercises/${exerciseType.slug}`);
  }

  const exercise = await getExercise(id);

  if (!exercise) {
    notFound();
  }

  if (exercise.type !== "WRITING") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-2">
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
          title={t("edit")}
          highlight={exercise.title}
          description={t("editDescription")}
        />
      </div>
      <WritingExerciseEditor
        exerciseType={exercise.type}
        initialData={{
          id: exercise.id,
          title: exercise.title,
          type: exercise.type,
          content: exercise.content,
        }}
      />
    </div>
  );
}
