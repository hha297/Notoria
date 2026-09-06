"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  descriptionToPlainText,
  isDescriptionEmpty,
  parseDescription,
} from "@/lib/description-content";
import { cn } from "@/lib/utils";

type DescriptionContentProps = {
  value?: string | null;
  className?: string;
  /**
   * Card/list previews: plain text + ellipsis.
   * TipTap nesting breaks CSS line-clamp, so clamped mode stays plain.
   */
  clampLines?: 2 | 3 | 4;
};

/** Read-only description — full rich text, or clamped plain text on cards. */
export function DescriptionContent({
  value,
  className,
  clampLines,
}: DescriptionContentProps) {
  if (clampLines) {
    const plain = descriptionToPlainText(value);
    if (!plain) return null;

    return (
      <p
        className={cn(
          "leading-relaxed",
          clampLines === 2 && "line-clamp-2",
          clampLines === 3 && "line-clamp-3",
          clampLines === 4 && "line-clamp-4",
          className,
        )}
      >
        {plain}
      </p>
    );
  }

  const doc = parseDescription(value);

  if (isDescriptionEmpty(doc)) {
    return null;
  }

  return (
    <div className={className}>
      <RichTextEditor
        content={doc}
        editable={false}
        variant="notes"
        className="border-0 bg-transparent shadow-none [&_.ProseMirror]:p-0"
      />
    </div>
  );
}
