import type { JSONContent } from "@tiptap/react";
import { tipTapDocumentToHtml } from "@/lib/editor/render-document";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  content?: JSONContent | null;
  className?: string;
  /** Compact notes / description shell. */
  variant?: "full" | "notes";
};

const PROSE_CLASSES =
  "prose prose-neutral dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] " +
  "prose-headings:font-heading " +
  "prose-h1:text-2xl prose-h1:font-medium prose-h1:leading-tight " +
  "prose-h2:text-xl prose-h2:font-medium prose-h2:leading-tight " +
  "prose-h3:text-lg prose-h3:font-medium prose-h3:leading-snug " +
  "[&_img]:h-auto [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:max-w-full";

/**
 * Read-only TipTap document display.
 * Renders semantic heading tags from `attrs.level` (not a live TipTap editor).
 */
export function RichTextContent({
  content,
  className,
  variant = "full",
}: RichTextContentProps) {
  const html = tipTapDocumentToHtml(content);

  if (!html.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl",
        className,
      )}
    >
      <div
        className={cn(
          PROSE_CLASSES,
          variant === "notes" ? "px-0 py-0" : "px-4 py-3",
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
