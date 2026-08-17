import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { getVocabularyWord } from "@/lib/actions/vocabulary";
import { getCurrentAiAccess } from "@/lib/auth/ai-access";
import { getActiveWorkspaceCustomTags } from "@/lib/actions/workspaces";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function EditVocabularyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    notFound();
  }

  const [word, existingCustomTags, aiAccess] = await Promise.all([
    getVocabularyWord(id),
    getActiveWorkspaceCustomTags(),
    getCurrentAiAccess(),
  ]);

  if (!word) {
    notFound();
  }

  const previewHref = `/vocabulary/${word.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href={previewHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToPreview")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("editWord")}
          highlight={word.word}
          description={t("editDescription")}
        />
      </div>
      <VocabularyForm
        previewHref={previewHref}
        existingCustomTags={existingCustomTags}
        canUseAi={aiAccess.canUseAi}
        language={workspace.language}
        initialData={{
          id: word.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          synonyms: word.synonyms,
          notes: word.notes,
          meanings: word.meanings,
          examples: word.examples,
          tags: word.tags,
        }}
      />
    </div>
  );
}
