import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { FillBlankSession } from "@/components/exercises/fill-blank-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function FillInBlankPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="fill-in-blank"
        title={t("types.fill-in-blank.label")}
        backLabel={t("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="fill-in-blank"
      title={t("types.fill-in-blank.label")}
      sourceLabel={workspace.name}
      backLabel={t("backToStudio")}
    >
      <FillBlankSession
        workspaceId={workspace.id}
        words={words}
        language={workspace.language}
      />
    </ExerciseSessionPageFrame>
  );
}
