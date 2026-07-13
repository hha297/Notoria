import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { getLanguageName } from "@/lib/languages";
import { getWorkplaceLanguage } from "@/lib/workplace";

export default async function NewVocabularyPage() {
  const workplaceLanguage = await getWorkplaceLanguage();
  const languageName = getLanguageName(workplaceLanguage);

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-2">
      <PageHeader
        eyebrow="Vocabulary"
        title="Add"
        highlight="word"
        description={`Enter a ${languageName} word and one or more meanings.`}
      />
      <VocabularyForm />
    </div>
  );
}
