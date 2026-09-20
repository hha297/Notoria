import { notFound } from "next/navigation";
import { WritingEditor } from "@/components/writing/writing-editor";
import { getWritingDocument } from "@/lib/actions/writing";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function EditWritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, workspace] = await Promise.all([
    getWritingDocument(id),
    getActiveWorkspace(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <WritingEditor
      exerciseType="WRITING"
      previewHref={`/writing/${document.id}`}
      language={workspace?.language ?? "en"}
      initialData={{
        id: document.id,
        title: document.title,
        description: document.description,
        type: document.type,
        content: document.content,
      }}
    />
  );
}
