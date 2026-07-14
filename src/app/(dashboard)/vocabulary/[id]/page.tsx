import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { getVocabularyWord } from "@/lib/actions/vocabulary";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function VocabularyDetailPage({
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

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-2">
      <PageHeader
        eyebrow={t("title")}
        title={t("editWord")}
        highlight={word.word}
        description={t("formDescription")}
      />
      <VocabularyForm
        initialData={{
          id: word.id,
          word: word.word,
          partOfSpeech: word.partOfSpeech,
          notes: word.notes,
          meanings: word.meanings,
          examples: word.examples,
          tags: word.tags,
        }}
      />
    </div>
  );
}
