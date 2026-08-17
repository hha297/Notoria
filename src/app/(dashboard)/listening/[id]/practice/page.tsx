import { notFound, redirect } from "next/navigation";
import { ListeningLockedPage } from "@/components/listening/listening-locked";
import { getListeningLesson } from "@/lib/actions/listening";
import { getCurrentProAccess } from "@/lib/auth/pro-access";

export const dynamic = "force-dynamic";

export default async function ListeningPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proAccess = await getCurrentProAccess();
  if (!proAccess.hasProAccess) {
    return <ListeningLockedPage />;
  }

  const lesson = await getListeningLesson(id);

  if (!lesson) {
    notFound();
  }

  redirect(`/listening/${id}`);
}
