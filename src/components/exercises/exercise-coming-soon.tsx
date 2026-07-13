import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import type { ExerciseTypeConfig } from "@/lib/exercise-types";

type ExerciseComingSoonProps = {
  exerciseType: ExerciseTypeConfig;
};

export function ExerciseComingSoon({ exerciseType }: ExerciseComingSoonProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-10 pt-2">
      <div className="space-y-6">
        <Link
          href="/exercises"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          Back to formats
        </Link>
        <PageHeader
          eyebrow="Exercises"
          title={exerciseType.label}
          highlight="coming soon"
          description={exerciseType.description}
        />
      </div>

      <div className="empty-state py-16">
        <Construction className="mx-auto mb-4 size-10 text-muted-foreground" />
        <p className="text-lg font-medium text-ink">
          {exerciseType.label} editor is on the way
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This exercise format will be available in a future update.
        </p>
        <LinkButton href="/exercises" variant="outline" className="mt-6">
          Choose another format
        </LinkButton>
      </div>
    </div>
  );
}
