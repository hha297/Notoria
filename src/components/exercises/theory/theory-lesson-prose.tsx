"use client";

import type { JSONContent } from "@tiptap/react";
import { renderBlock } from "@/lib/editor/render-document";
import featureStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type TheoryLessonProseProps = {
  doc: JSONContent;
  variant?: "article" | "example" | "note";
  className?: string;
};

export function TheoryLessonProse({
  doc,
  variant = "article",
  className,
}: TheoryLessonProseProps) {
  const blocks = doc.content ?? [];
  if (blocks.length === 0) return null;

  return (
    <div
      className={cn(
        mx(featureStyles, "theory-lesson-prose min-w-0 max-w-full wrap-anywhere"),
        variant === "example" && mx(featureStyles, "theory-lesson-example"),
        variant === "note" && mx(featureStyles, "theory-lesson-note"),
        className,
      )}
    >
      {blocks.map((block, index) => (
        <div
          key={`${block.type ?? "block"}-${index}`}
          className="contents"
          dangerouslySetInnerHTML={{ __html: renderBlock(block) }}
        />
      ))}
    </div>
  );
}
