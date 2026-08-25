import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { ExerciseStudio } from "@/components/exercises/exercise-studio";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getTheoryNotes } from "@/lib/actions/theory";
import { toTheoryExerciseCard } from "@/lib/theory-exercises/cards";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("studio")}
          description={t("description")}
        />
        <NoWorkspaceEmpty />
      </PageShell>
    );
  }

  const notes = await getTheoryNotes();
  const theories = notes.map((note) => toTheoryExerciseCard(note));

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("studio")}
        description={t("studioDescription")}
      >
        <ShowTutorialButton section="exercise" />
      </PageHeader>

      <ExerciseStudio theories={theories} />
    </PageShell>
  );
}
