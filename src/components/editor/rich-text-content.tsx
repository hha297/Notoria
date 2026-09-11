"use client";

import { useEffect, useMemo, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { useTranslations } from "next-intl";
import {
  computeHiddenBlockIndices,
  headingHasSectionContent,
} from "@/lib/editor/heading-collapse";
import {
  coerceHeadingLevel,
  headingTagForLevel,
  normalizeTipTapHeadingLevels,
} from "@/lib/editor/heading-level";
import { renderBlock } from "@/lib/editor/render-document";
import { cn } from "@/lib/utils";

type RichTextContentProps = {
  content?: JSONContent | null;
  className?: string;
  /** Compact notes / description shell. */
  variant?: "full" | "notes";
  /**
   * Optional sessionStorage key for heading collapse UI state.
   * Does not alter persisted TipTap JSON.
   */
  collapseStorageKey?: string | null;
};

const PROSE_CLASSES =
  "prose prose-neutral dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] " +
  "prose-headings:font-heading " +
  "prose-h1:text-2xl prose-h1:font-medium prose-h1:leading-tight " +
  "prose-h2:text-xl prose-h2:font-medium prose-h2:leading-tight " +
  "prose-h3:text-lg prose-h3:font-medium prose-h3:leading-snug " +
  "[&_img]:h-auto [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:max-w-full";

function blockStableKey(block: JSONContent, index: number): string {
  if (block.type !== "heading") return `b:${index}`;
  const level = coerceHeadingLevel(block.attrs?.level);
  const text =
    (block.content ?? [])
      .map((child) => (child.type === "text" ? (child.text ?? "") : ""))
      .join("")
      .slice(0, 120);
  return `${index}:${level}:${text}`;
}

function loadCollapsedKeys(storageKey: string | null): Set<string> {
  if (!storageKey || typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

function persistCollapsedKeys(storageKey: string | null, keys: Set<string>) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...keys]));
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * Read-only TipTap document display with optional collapsible headings.
 * Renders semantic heading tags from `attrs.level` (not a live TipTap editor).
 */
export function RichTextContent({
  content,
  className,
  variant = "full",
  collapseStorageKey = null,
}: RichTextContentProps) {
  const tEditor = useTranslations("editor");
  const normalized = useMemo(
    () => normalizeTipTapHeadingLevels(content),
    [content],
  );
  const blocks = normalized.content ?? [];

  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setCollapsedKeys(loadCollapsedKeys(collapseStorageKey));
  }, [collapseStorageKey]);

  const collapsedIndices = useMemo(() => {
    const set = new Set<number>();
    blocks.forEach((block, index) => {
      if (block.type !== "heading") return;
      if (collapsedKeys.has(blockStableKey(block, index))) set.add(index);
    });
    return set;
  }, [blocks, collapsedKeys]);

  const hidden = useMemo(
    () => computeHiddenBlockIndices(blocks, collapsedIndices),
    [blocks, collapsedIndices],
  );

  if (blocks.length === 0) {
    return null;
  }

  function toggleHeading(index: number) {
    const block = blocks[index];
    if (!block || block.type !== "heading") return;
    if (!headingHasSectionContent(blocks, index)) return;

    const key = blockStableKey(block, index);
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persistCollapsedKeys(collapseStorageKey, next);
      return next;
    });
  }

  return (
    <div className={cn("overflow-hidden rounded-xl", className)}>
      <div
        className={cn(
          PROSE_CLASSES,
          "tiptap",
          variant === "notes" ? "px-0 py-0" : "px-4 py-3",
        )}
      >
        {blocks.map((block, index) => {
          if (hidden.has(index)) return null;

          if (block.type === "heading") {
            const level = coerceHeadingLevel(block.attrs?.level);
            const Tag = headingTagForLevel(level);
            const hasSection = headingHasSectionContent(blocks, index);
            const isCollapsed = collapsedIndices.has(index);
            const headingHtml = renderBlock(block)
              .replace(/^<h[1-6]>/, "")
              .replace(/<\/h[1-6]>$/, "");

            return (
              <Tag key={blockStableKey(block, index)}>
                {hasSection ? (
                  <button
                    type="button"
                    className="heading-collapse-btn"
                    contentEditable={false}
                    aria-expanded={!isCollapsed}
                    aria-label={
                      isCollapsed
                        ? tEditor("headingExpand")
                        : tEditor("headingCollapse")
                    }
                    onClick={() => toggleHeading(index)}
                  >
                    {isCollapsed ? "▸" : "▾"}
                  </button>
                ) : null}
                <span dangerouslySetInnerHTML={{ __html: headingHtml }} />
              </Tag>
            );
          }

          return (
            <div
              key={`block-${index}`}
              className="contents"
              dangerouslySetInnerHTML={{ __html: renderBlock(block) }}
            />
          );
        })}
      </div>
    </div>
  );
}
