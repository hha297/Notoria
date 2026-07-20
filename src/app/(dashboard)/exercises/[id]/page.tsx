import { notFound, redirect } from "next/navigation";
import { getExerciseTypeBySlug } from "@/lib/exercise-types";
import { getExercise } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function LegacyExerciseIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exerciseType = getExerciseTypeBySlug(id);

  if (exerciseType) {
    redirect(`/exercises/${exerciseType.slug}`);
  }

  const exercise = await getExercise(id);

  if (!exercise) {
    notFound();
  }

  if (exercise.type === "WRITING") {
    redirect(`/writing/${exercise.id}`);
  }

  notFound();
}
