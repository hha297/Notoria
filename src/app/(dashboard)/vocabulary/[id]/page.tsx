import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { VocabularyPreview } from "@/components/vocabulary/vocabulary-preview";
import { getReviewLaterMarked } from "@/lib/actions/review-later";
import { getVocabularyWord } from "@/lib/actions/vocabulary";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VocabularyWordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    notFound();
  }

  const [word, reviewLaterMarked] = await Promise.all([
    getVocabularyWord(id),
    getReviewLaterMarked({ entityType: "vocabulary", entityId: id }),
  ]);

  if (!word) {
    notFound();
  }

  return (
    <PageShell className="vocab-lexicon-shell">
      <div className="vocab-lexicon writing-atelier">
        <VocabularyPreview
          id={word.id}
          word={word.word}
          partOfSpeech={word.partOfSpeech}
          synonyms={word.synonymRefs}
          unmatchedSynonyms={word.unmatchedSynonyms}
          notes={word.notes}
          meanings={word.meanings}
          examples={word.examples}
          tags={word.tags}
          reviewLaterMarked={reviewLaterMarked}
        />
      </div>
    </PageShell>
  );
}
