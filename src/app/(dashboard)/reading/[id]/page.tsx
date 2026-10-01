import { notFound } from "next/navigation";
import { ReadingPassageView } from "@/components/reading/reading-passage-view";
import { getReadingPassage } from "@/lib/actions/reading";
import { getActiveWorkspace } from "@/lib/workspace";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReadingPassagePage({ params }: PageProps) {
  const { id } = await params;
  const workspace = await getActiveWorkspace();
  if (!workspace) notFound();

  try {
    await getReadingPassage(id);
  } catch {
    notFound();
  }

  return <ReadingPassageView workspaceId={workspace.id} passageId={id} />;
}
