import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseEditor } from "@/components/exercises/exercise-editor";
import { getExercise } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exercise = await getExercise(id);

  if (!exercise) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Exercises"
        title={exercise.title}
        description="Changes autosave after the first save."
      />
      <ExerciseEditor
        initialData={{
          id: exercise.id,
          title: exercise.title,
          type: exercise.type,
          content: exercise.content as JSONContent,
        }}
      />
    </div>
  );
}
