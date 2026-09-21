import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { MultipleChoiceSession } from "@/components/exercises/multiple-choice-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function MultipleChoicePage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="multiple-choice"
        title={t("types.multiple-choice.label")}
        backLabel={t("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="multiple-choice"
      title={t("types.multiple-choice.label")}
      sourceLabel={workspace.name}
      backLabel={t("backToStudio")}
    >
      <MultipleChoiceSession
        workspaceId={workspace.id}
        words={words}
        language={workspace.language}
      />
    </ExerciseSessionPageFrame>
  );
}
