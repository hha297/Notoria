import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { ExerciseStudioClient } from "@/components/exercises/exercise-studio-client";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function ExercisesPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <PageShell className="route-atelier writing-atelier" data-route="exercises">
        <div className="flex flex-col gap-10 lg:gap-12">
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("title")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
          </header>
          <NoWorkspaceEmpty />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="route-atelier writing-atelier" data-route="exercises">
      <div className="flex flex-col gap-10 lg:gap-12">
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("title")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("studioDescription")}</p>
          </div>
          <div className="writing-hero-actions">
            <ShowTutorialButton section="exercise" />
          </div>
        </header>

        <ExerciseStudioClient
          workspaceId={workspace.id}
          workspaceName={workspace.name}
        />
      </div>
    </PageShell>
  );
}
