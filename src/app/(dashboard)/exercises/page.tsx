import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseTypePicker } from "@/components/exercises/exercise-type-picker";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
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
    </div>
  );
}
