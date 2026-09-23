import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { FlashcardSession } from "@/components/flashcards/flashcard-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

type FlashcardPageProps = {
  searchParams: Promise<{ focus?: string }>;
};

export default async function ExerciseFlashcardPage({ searchParams }: FlashcardPageProps) {
  const params = await searchParams;
  const focus = params.focus === "weak" ? "weak" : undefined;

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

  const words = await getFlashcardWords(focus ? { focus } : undefined);

  return (
    <ExerciseSessionPageFrame
      slug="flashcard"
      title={focus === "weak" ? t("weakTitle") : t("title")}
      sourceLabel={workspace.name}
      backLabel={tExercises("backToStudio")}
    >
      <FlashcardSession workspaceId={workspace.id} words={words} />
    </ExerciseSessionPageFrame>
  );
}
