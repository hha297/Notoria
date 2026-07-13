import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { getVocabularyWord } from "@/lib/actions/vocabulary";

export const dynamic = "force-dynamic";

export default async function VocabularyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const word = await getVocabularyWord(id);

  if (!word) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-2">
      <PageHeader
        eyebrow="Vocabulary"
        title="Edit"
        highlight={word.word}
        description="Update word details and reorder meanings."
      />
      <VocabularyForm initialData={word} />
    </div>
  );
}
