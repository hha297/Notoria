import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { Badge } from "@/components/ui/badge";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getExerciseTypeLabel } from "@/lib/exercise-types";
import { getExercises } from "@/lib/actions/exercises";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();
  const exercises = workspace ? await getExercises() : [];

  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl space-y-10 pt-2">
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("studio")}
          description={t("description")}
        />
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pt-2">
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("studio")}
        description="Pick a card style for your new exercise."
      />

      <ExerciseTypePicker />

      {exercises.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-medium text-ink">
            {t("saved")}
          </h2>
          <div className="grid gap-4">
            {exercises.map((exercise) => (
              <Link
                key={exercise.id}
                href={`/exercises/${exercise.id}`}
                className="card-surface block transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4 p-0">
                  <div>
                    <h3 className="text-xl font-medium text-ink">
                      {exercise.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("updated")}{" "}
                      {formatDistanceToNow(new Date(exercise.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {getExerciseTypeLabel(exercise.type)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
