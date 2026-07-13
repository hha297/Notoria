import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseComingSoon } from "@/components/exercises/exercise-coming-soon";
import { WritingExerciseEditor } from "@/components/exercises/writing-exercise-editor";
import { EXERCISE_TYPES, getExerciseTypeBySlug } from "@/lib/exercise-types";
import { getExercise } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exerciseType = getExerciseTypeBySlug(id);

  if (exerciseType) {
    if (id !== "writing") {
      return <ExerciseComingSoon exerciseType={exerciseType} />;
    }

    return (
      <div className="mx-auto max-w-4xl space-y-10 pt-2">
        <div className="space-y-6">
          <Link
            href="/exercises"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            Back to exercises
          </Link>
          <PageHeader
            eyebrow="Exercises"
            title="New"
            highlight="writing"
            description="Write prompts, questions, and practice tasks in the rich editor."
          />
        </div>
        <WritingExerciseEditor exerciseType={exerciseType.type} />
      </div>
    );
  }

  const exercise = await getExercise(id);

  if (!exercise) {
    notFound();
  }

  if (exercise.type !== "WRITING") {
    const typeConfig =
      EXERCISE_TYPES.find((item) => item.type === exercise.type) ??
      EXERCISE_TYPES[0];

    return <ExerciseComingSoon exerciseType={typeConfig} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Back to exercises
        </Link>
        <PageHeader
          eyebrow="Exercises"
          title="Edit"
          highlight={exercise.title}
          description="Changes autosave after the first save."
        />
      </div>
      <WritingExerciseEditor
        exerciseType={exercise.type}
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
