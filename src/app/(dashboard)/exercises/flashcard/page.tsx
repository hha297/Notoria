import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function ExerciseFlashcardPage() {
  const [t, tExercises, workspace] = await Promise.all([
    getTranslations("flashcards"),
    getTranslations("exercises"),
    getActiveWorkspace(),
  ]);

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="flashcard"
        title={t("title")}
        backLabel={tExercises("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="flashcard"
      title={t("title")}
      sourceLabel={workspace.name}
      backLabel={tExercises("backToStudio")}
    >
      <FlashcardSession workspaceId={workspace.id} words={words} />
    </ExerciseSessionPageFrame>
  );
}
