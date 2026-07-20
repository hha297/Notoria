import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { WritingEditor } from "@/components/writing/writing-editor";
import { getWritingDocument } from "@/lib/actions/writing";

export const dynamic = "force-dynamic";

export default async function EditWritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("writing");
  const document = await getWritingDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href="/writing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("edit")}
          highlight={document.title}
          description={t("editDescription")}
        />
      </div>
      <WritingEditor
        exerciseType="WRITING"
        initialData={{
          id: document.id,
          title: document.title,
          type: document.type,
          content: document.content,
        }}
      />
    </div>
  );
}
