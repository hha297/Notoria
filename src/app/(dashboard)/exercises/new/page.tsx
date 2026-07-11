import { PageHeader } from "@/components/layout/page-header";
import { ExerciseEditor } from "@/components/exercises/exercise-editor";

export default function NewExercisePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Exercises"
        title="New"
        highlight="exercise"
        description="Write questions, prompts, and practice tasks in the rich editor."
      />
      <ExerciseEditor />
    </div>
  );
}
