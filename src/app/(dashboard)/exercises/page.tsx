import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { Badge } from "@/components/ui/badge";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getExerciseTypeLabel } from "@/lib/exercise-types";
import { getExercises } from "@/lib/actions/exercises";
import { parseWritingContent } from "@/lib/writing/content";
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
    <div className="mx-auto max-w-5xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("studio")}
        description={t("studioDescription")}
      />

      <ExerciseTypePicker />

      {exercises.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <h2 className="font-heading text-lg font-medium text-ink sm:text-xl">
            {t("saved")}
          </h2>
          <div className="grid gap-3 sm:gap-4">
            {exercises.map((exercise) => {
              const writing =
                exercise.type === "WRITING"
                  ? parseWritingContent(exercise.content)
                  : null;

              return (
              <Link
                key={exercise.id}
                href={`/exercises/${exercise.id}`}
                className="card-surface block transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-medium text-ink sm:text-xl">
                      {exercise.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("updated")}{" "}
                      {formatDistanceToNow(new Date(exercise.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {writing && (
                      <Badge variant="outline">
                        {writing.mode === "question_set"
                          ? t("writing.modes.questionSet")
                          : t("writing.modes.richDocument")}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {getExerciseTypeLabel(exercise.type)}
                    </Badge>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
