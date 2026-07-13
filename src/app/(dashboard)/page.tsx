import Link from "next/link";
import { BookOpen, Dumbbell, Languages, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { LinkButton } from "@/components/ui/link-button";
import { getExercises } from "@/lib/actions/exercises";
import { getVocabularyWords } from "@/lib/actions/vocabulary";
import { getLanguageName } from "@/lib/languages";
import { getWorkplaceLanguage } from "@/lib/workplace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const workplaceLanguage = await getWorkplaceLanguage();
  const languageName = getLanguageName(workplaceLanguage);

  const [words, exercises] = await Promise.all([
    getVocabularyWords(),
    getExercises(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Overview"
        title="Your"
        highlight="workspace"
        description={`Store vocabulary, build exercises, and study ${languageName} in one private place.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Words saved" value={words.length} />
        <StatCard label="Exercises created" value={exercises.length} featured />
        <StatCard label="Workplace" value={languageName} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface">
          <div className="mb-6 flex items-center gap-2">
            <Languages className="size-5 text-ink" />
            <h2 className="heading-md">Vocabulary</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Add words with multiple sortable meanings.
          </p>
          <div className="flex gap-2">
            <LinkButton href="/vocabulary/new">
              <Plus className="size-4" />
              Add word
            </LinkButton>
            <LinkButton href="/vocabulary" variant="outline">
              View all
            </LinkButton>
          </div>
        </div>

        <div className="card-surface-dark">
          <div className="mb-6 flex items-center gap-2">
            <Dumbbell className="size-5" />
            <h2 className="heading-md">Exercises</h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-on-dark-muted">
            Create rich exercises with the editor.
          </p>
          <div className="flex gap-2">
            <LinkButton
              href="/exercises/new"
              variant="secondary"
              className="bg-on-primary text-ink hover:bg-on-primary/90"
            >
              <Plus className="size-4" />
              New exercise
            </LinkButton>
            <LinkButton
              href="/exercises"
              variant="ghost"
              className="text-on-primary hover:bg-on-dark-faint"
            >
              View all
            </LinkButton>
          </div>
        </div>
      </div>

      {words.length > 0 && (
        <div className="card-surface">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="size-5 text-ink" />
            <h2 className="heading-md">Recent words</h2>
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
