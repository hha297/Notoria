import { notFound } from "next/navigation";
import { ListeningLessonView } from "@/components/listening/listening-lesson-view";
import { getListeningLesson } from "@/lib/actions/listening";
import { folderHref } from "@/lib/folders/paths";

export const maxDuration = 300;

export default async function ListeningLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getListeningLesson(id);

  if (!lesson) {
    notFound();
  }

  return (
    <ListeningLessonView
      lesson={lesson}
      backHref={folderHref("listening", lesson.folderId)}
    />
  );
}
