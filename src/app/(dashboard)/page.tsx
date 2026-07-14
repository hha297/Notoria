import Link from "next/link";
import { BookOpen, Dumbbell, Languages, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { LinkButton } from "@/components/ui/link-button";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getExercises } from "@/lib/actions/exercises";
import { getVocabularyWords } from "@/lib/actions/vocabulary";
import { getActiveWorkspace } from "@/lib/workspace";
import { getLanguageName } from "@/lib/languages";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="space-y-10">
        <PageHeader
          eyebrow={t("overview")}
          title={t("your")}
          highlight={t("workspaceLabel")}
          description={t("description", { language: "—" })}
        />
        <NoWorkspaceEmpty />
      </div>
    );
  }

  const languageName = getLanguageName(workspace.language);

  const [words, exercises] = await Promise.all([
    getVocabularyWords(),
    getExercises(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t("overview")}
        title={t("your")}
        highlight={t("workspaceLabel")}
        description={t("description", { language: languageName })}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("wordsSaved")} value={words.length} />
        <StatCard label={t("exercisesCreated")} value={exercises.length} featured />
        <StatCard label={t("activeWorkspace")} value={workspace.name} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface">
          <div className="mb-6 flex items-center gap-2">
            <Languages className="size-5 text-ink" />
            <h2 className="heading-md">{t("vocabularyCardTitle")}</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            {t("vocabularyCardDescription")}
          </p>
          <div className="flex gap-2">
            <LinkButton href="/vocabulary/new">
              <Plus className="size-4" />
              {t("addWord")}
            </LinkButton>
            <LinkButton href="/vocabulary" variant="outline">
              {t("viewAll")}
            </LinkButton>
          </div>
        </div>

        <div className="card-surface-dark">
          <div className="mb-6 flex items-center gap-2">
            <Dumbbell className="size-5" />
            <h2 className="heading-md">{t("exercisesCardTitle")}</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-on-dark-muted">
            {t("exercisesCardDescription")}
          </p>
          <div className="flex gap-2">
            <LinkButton
              href="/exercises"
              variant="secondary"
              className="bg-on-primary text-ink hover:bg-on-primary/90"
            >
              {t("openStudio")}
            </LinkButton>
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <div className="card-surface">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="size-5 text-ink" />
            <h2 className="heading-md">{t("recentWords")}</h2>
          </div>
          <div className="space-y-2">
            {words.slice(0, 5).map((word) => (
              <Link
                key={word.id}
                href={`/vocabulary/${word.id}`}
                className="flex items-center justify-between rounded-lg border border-hairline-cloud p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-semibold text-ink">{word.word}</p>
                  <p className="text-sm text-muted-foreground">
                    {word.meanings.map((m) => m.meaning).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
