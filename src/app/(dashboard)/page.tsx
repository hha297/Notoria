import Link from "next/link";
import { BookOpen, Dumbbell, Languages, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { LinkButton } from "@/components/ui/link-button";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
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

  const [words] = await Promise.all([getVocabularyWords()]);
  const practiceReadyWords = words.filter((word) => word.meanings.length > 0).length;

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        eyebrow={t("overview")}
        title={t("your")}
        highlight={t("workspaceLabel")}
        description={t("description", { language: languageName })}
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatCard label={t("wordsSaved")} value={words.length} />
        <StatCard label={t("wordsReadyToPractice")} value={practiceReadyWords} featured />
        <StatCard
          label={t("activeWorkspace")}
          value={workspace.name}
          className="sm:col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <div className="card-surface">
          <div className="mb-4 flex items-center gap-2 sm:mb-6">
            <Languages className="size-5 shrink-0 text-ink" />
            <h2 className="heading-md">{t("vocabularyCardTitle")}</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:mb-6">
            {t("vocabularyCardDescription")}
          </p>
          <div className="flex flex-wrap gap-2">
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
          <div className="mb-4 flex items-center gap-2 sm:mb-6">
            <Dumbbell className="size-5 shrink-0" />
            <h2 className="heading-md">{t("exercisesCardTitle")}</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-on-dark-muted sm:mb-6">
            {t("exercisesCardDescription")}
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton
              href="/exercises"
              variant="secondary"
              className="bg-on-primary text-ink hover:bg-on-primary/90"
            >
              {t("startPracticing")}
            </LinkButton>
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <div className="card-surface">
          <div className="mb-4 flex items-center gap-2 sm:mb-6">
            <BookOpen className="size-5 shrink-0 text-ink" />
            <h2 className="heading-md">{t("recentWords")}</h2>
          </div>
          <div className="space-y-2">
            {words.slice(0, 5).map((word) => (
              <Link
                key={word.id}
                href={`/vocabulary/${word.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline-cloud p-3 transition-colors hover:bg-muted/50 sm:p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{word.word}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
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
