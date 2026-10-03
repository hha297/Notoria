import { ReadingLibrary } from "@/app/(dashboard)/reading/reading-library";

export default async function ReadingFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <ReadingLibrary folderId={folderId} />;
}
