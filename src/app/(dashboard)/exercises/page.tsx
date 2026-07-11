import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import { getExercises } from "@/lib/actions/exercises";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Practice"
        title="Exercise"
        highlight="studio"
        description="Rich exercise documents with formatting, checklists and tables."
      >
        <LinkButton href="/exercises/new">
          <Plus className="size-4" />
          New exercise
        </LinkButton>
      </PageHeader>

      {exercises.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted-foreground">No exercises yet.</p>
          <LinkButton href="/exercises/new" className="mt-4">
            Create your first exercise
          </LinkButton>
        </div>
      ) : (
        <div className="grid gap-4">
          {exercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/exercises/${exercise.id}`}
              className="card-surface block transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-4 p-0">
                <div>
                  <h2 className="text-xl font-medium text-ink">
                    {exercise.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(exercise.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant="secondary">
                  {exercise.type.replaceAll("_", " ")}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
