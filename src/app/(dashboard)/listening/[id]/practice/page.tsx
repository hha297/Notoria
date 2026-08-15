import { notFound, redirect } from "next/navigation";
import { getListeningLesson } from "@/lib/actions/listening";

export const dynamic = "force-dynamic";

export default async function ListeningPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getListeningLesson(id);

  if (!lesson) {
    notFound();
  }

  redirect(`/listening/${id}`);
}
