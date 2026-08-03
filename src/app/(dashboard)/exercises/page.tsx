import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
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

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("studio")}
        description={t("studioDescription")}
      />

      <ExerciseTypePicker />
    </PageShell>
  );
}
