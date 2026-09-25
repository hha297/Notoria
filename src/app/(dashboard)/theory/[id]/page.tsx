import { notFound } from "next/navigation";
import { TheoryReader } from "@/components/theory/theory-reader";
import { getReviewLaterMarked } from "@/lib/actions/review-later";
import { getTheoryNote } from "@/lib/actions/theory";
import { folderHref } from "@/lib/folders/paths";

export default async function TheoryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, reviewLaterMarked] = await Promise.all([
    getTheoryNote(id),
    getReviewLaterMarked({ entityType: "theory", entityId: id }),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <TheoryReader
      id={note.id}
      title={note.title}
      content={note.content}
      updatedAt={note.updatedAt.toISOString()}
      backHref={folderHref("theory", note.folderId)}
      reviewLaterMarked={reviewLaterMarked}
    />
  );
}
