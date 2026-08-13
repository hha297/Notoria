import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TheoryReader } from "@/components/theory/theory-reader";
import { getTheoryNote } from "@/lib/actions/theory";

export const dynamic = "force-dynamic";

export default async function TheoryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("theory");
  const note = await getTheoryNote(id);

  if (!note) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href="/theory"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={note.title}
          description={t("previewDescription")}
        />
      </div>
      <TheoryReader
        id={note.id}
        title={note.title}
        content={note.content}
        updatedAt={note.updatedAt.toISOString()}
      />
    </div>
  );
}
