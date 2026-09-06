import type { JSONContent } from "@tiptap/react";
import { serializeTheoryContent } from "@/lib/theory/content";

export type TheoryEditorSnapshot = {
  title: string;
  category: string;
  description: string;
  content: string;
};

export function buildTheoryEditorSnapshot(input: {
  title: string;
  category: string;
  description: string;
  doc: JSONContent;
}): TheoryEditorSnapshot {
  const title = input.title.trim();
  const description = input.description.trim();
  const category = input.category.trim();
  return {
    title,
    category,
    description,
    content: JSON.stringify(
      serializeTheoryContent({
        kind: "theory",
        version: 1,
        category,
        description,
        doc: input.doc,
      }),
    ),
  };
}

export function theoryEditorSnapshotsEqual(
  a: TheoryEditorSnapshot,
  b: TheoryEditorSnapshot,
) {
  return (
    a.title === b.title &&
    a.category === b.category &&
    a.description === b.description &&
    a.content === b.content
  );
}

export function theoryEditorHasRequiredContent(snapshot: TheoryEditorSnapshot) {
  return snapshot.title.length > 0;
}
