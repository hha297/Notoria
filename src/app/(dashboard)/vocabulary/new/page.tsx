import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";

export default function NewVocabularyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Vocabulary"
        title="Add"
        highlight="word"
        description="Enter a Finnish word and one or more meanings."
      />
      <VocabularyForm />
    </div>
  );
}
