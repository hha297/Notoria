import { notFound } from "next/navigation";
import { WritingPreview } from "@/components/writing/writing-preview";
import { getReviewLaterMarked } from "@/lib/actions/review-later";
import { getWritingDocument } from "@/lib/actions/writing";
import { folderHref } from "@/lib/folders/paths";

export default async function WritingDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, reviewLaterMarked] = await Promise.all([
    getWritingDocument(id),
    getReviewLaterMarked({ entityType: "writing", entityId: id }),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <WritingPreview
      id={document.id}
      title={document.title}
      description={document.description}
      content={document.content}
      backHref={folderHref("writing", document.folderId)}
      reviewLaterMarked={reviewLaterMarked}
    />
  );
}
