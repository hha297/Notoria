import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
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
    <PageShell className="vocab-lexicon-shell">
      <div className="vocab-lexicon writing-atelier flex flex-col gap-6 lg:gap-8">
        <Link href={previewHref} className="writing-back">
          <ArrowLeft className="size-4 shrink-0" />
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
    </PageShell>
  );
}
