import { ListeningLibrary } from "@/app/(dashboard)/listening/listening-library";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ListeningFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <ListeningLibrary folderId={folderId} />;
}
