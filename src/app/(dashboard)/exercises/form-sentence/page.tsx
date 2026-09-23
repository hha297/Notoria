import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { FormSentenceSession } from "@/components/exercises/form-sentence-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function FormSentencePage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="form-sentence"
        title={t("types.form-sentence.label")}
        backLabel={t("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="form-sentence"
      title={t("types.form-sentence.label")}
      sourceLabel={workspace.name}
      backLabel={t("backToStudio")}
    >
      <FormSentenceSession
        workspaceId={workspace.id}
        words={words}
        language={workspace.language}
      />
    </ExerciseSessionPageFrame>
  );
}
