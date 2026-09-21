import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { TypeAnswerSession } from "@/components/exercises/type-answer-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function TypeAnswerPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="type-answer"
        title={t("types.type-answer.label")}
        backLabel={t("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="type-answer"
      title={t("types.type-answer.label")}
      sourceLabel={workspace.name}
      backLabel={t("backToStudio")}
    >
      <TypeAnswerSession
        workspaceId={workspace.id}
        words={words}
        language={workspace.language}
      />
    </ExerciseSessionPageFrame>
  );
}
