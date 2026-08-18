import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { ListeningLessonView } from "@/components/listening/listening-lesson-view";
import { ListeningLockedPage } from "@/components/listening/listening-locked";
import { getListeningLesson } from "@/lib/actions/listening";
import { getCurrentProAccess } from "@/lib/auth/pro-access";
import { folderHref } from "@/lib/folders/paths";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ListeningLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("listening");
  const proAccess = await getCurrentProAccess();

  if (!proAccess.hasProAccess) {
    return <ListeningLockedPage />;
  }

  const lesson = await getListeningLesson(id);

  if (!lesson) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href={folderHref("listening", lesson.folderId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={lesson.title}
          description={t("lessonDescription")}
        />
      </div>
      <ListeningLessonView lesson={lesson} />
    </div>
  );
}
