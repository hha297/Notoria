import { notFound } from "next/navigation";
import { TheoryEditor } from "@/components/theory/theory-editor";
import { getTheoryNote } from "@/lib/actions/theory";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function EditTheoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [note, workspace] = await Promise.all([
    getTheoryNote(id),
    getActiveWorkspace(),
  ]);

  if (!note) {
    notFound();
  }

  return (
    <TheoryEditor
      previewHref={`/theory/${note.id}`}
      language={workspace?.language ?? "en"}
      initialData={{
        id: note.id,
        title: note.title,
        content: note.content,
      }}
    />
  );
}
