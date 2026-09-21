import { getTranslations } from "next-intl/server";
import { ExerciseSessionPageFrame } from "@/components/exercises/exercise-session-page-frame";
import { MatchPairsSession } from "@/components/exercises/match-pairs-session";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getFlashcardWords } from "@/lib/actions/flashcards";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function MatchPairsPage() {
  const t = await getTranslations("exercises");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <ExerciseSessionPageFrame
        slug="match-pairs"
        title={t("types.match-pairs.label")}
        backLabel={t("backToStudio")}
      >
        <NoWorkspaceEmpty />
      </ExerciseSessionPageFrame>
    );
  }

  const words = await getFlashcardWords();

  return (
    <ExerciseSessionPageFrame
      slug="match-pairs"
      title={t("types.match-pairs.label")}
      sourceLabel={workspace.name}
      backLabel={t("backToStudio")}
    >
      <MatchPairsSession workspaceId={workspace.id} words={words} />
    </ExerciseSessionPageFrame>
  );
}
