import { WritingLibrary } from "@/app/(dashboard)/writing/writing-library";


export default async function WritingFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <WritingLibrary folderId={folderId} />;
}
