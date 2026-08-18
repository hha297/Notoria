import { TheoryLibraryPage } from "@/app/(dashboard)/theory/theory-library-page";

export const dynamic = "force-dynamic";

export default async function TheoryFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <TheoryLibraryPage folderId={folderId} />;
}
