import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { getVocabularyWord } from "@/lib/actions/vocabulary";
import { getActiveWorkspace } from "@/lib/workspace";

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

  const word = await getVocabularyWord(id);

  if (!word) {
    notFound();
  }

  const previewHref = `/vocabulary/${word.id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-1 sm:space-y-6 sm:pt-2">
      <Link
        href={previewHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        {t("backToPreview")}
      </Link>
      <VocabularyForm
        previewHref={previewHref}
        workspaceId={workspace.id}
        language={workspace.language}
        initialData={{
          id: word.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          notes: word.notes,
          synonymRefs: word.synonymRefs,
          meanings: word.meanings,
          examples: word.examples,
          tags: word.tags,
        }}
      />
    </div>
  );
}
