import { PageShell } from "@/components/layout/page-shell";
import { VocabularyPageLoading } from "@/components/vocabulary/vocabulary-page-loading";

export default function Loading() {
  return (
    <PageShell className="vocab-lexicon-shell">
      <VocabularyPageLoading />
    </PageShell>
  );
}
