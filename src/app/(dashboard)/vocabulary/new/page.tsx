import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function NewVocabularyPage() {
  const t = await getTranslations("vocabulary");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-3xl space-y-10 pt-2">
        <PageHeader
          eyebrow={t("title")}
          title={t("addWord")}
          highlight={t("bank")}
          description={t("disabledNoWorkspace")}
        />
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pt-2">
      <PageHeader
        eyebrow={t("title")}
        title={t("addWord")}
        highlight={t("bank")}
        description={t("formDescription")}
      />
      <VocabularyForm />
    </div>
  );
}
