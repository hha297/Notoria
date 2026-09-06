"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { afterEditorHydration } from "@/lib/editor/hydration";
import {
  descriptionDocToStored,
  descriptionPlainLength,
  normalizeDescription,
  parseDescription,
} from "@/lib/description-content";
import { cn } from "@/lib/utils";

type DescriptionFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  /** Called after TipTap finishes hydrating so parents can rebaseline dirty state. */
  onReady?: (value: string) => void;
  "aria-invalid"?: boolean;
};

export function DescriptionField({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  onReady,
  "aria-invalid": ariaInvalid,
}: DescriptionFieldProps) {
  const [doc, setDoc] = useState<JSONContent>(() => parseDescription(value));
  const lastEmittedRef = useRef(normalizeDescription(value));
  const hydrationCancelRef = useRef<(() => void) | null>(null);
  const plainLength = descriptionPlainLength(value);
  const overLimit =
    typeof maxLength === "number" ? plainLength > maxLength : false;

  useEffect(() => {
    const normalizedIncoming = normalizeDescription(value);
    if (normalizedIncoming === lastEmittedRef.current) return;
    lastEmittedRef.current = normalizedIncoming;
    setDoc(parseDescription(value));
  }, [value]);

  useEffect(() => {
    return () => {
      hydrationCancelRef.current?.();
    };
  }, []);

  function emitFromDoc(nextDoc: JSONContent) {
    const stored = descriptionDocToStored(nextDoc);
    lastEmittedRef.current = normalizeDescription(stored);
    setDoc(nextDoc);
    onChange(stored);
  }

  function handleEditorReady(editor: Editor | null) {
    hydrationCancelRef.current?.();
    hydrationCancelRef.current = null;
    if (!editor) return;
    hydrationCancelRef.current = afterEditorHydration(() => {
      const hydrated = editor.getJSON();
      const stored = descriptionDocToStored(hydrated);
      const normalized = normalizeDescription(stored);
      lastEmittedRef.current = normalized;
      setDoc(hydrated);
      // Sync storage if TipTap normalized legacy plain text (lists, etc.).
      if (normalizeDescription(value) !== normalized) {
        onChange(stored);
      }
      onReady?.(stored);
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        id={id}
        aria-invalid={ariaInvalid || overLimit || undefined}
        className={cn(
          "rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          (ariaInvalid || overLimit) &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        )}
      >
        <RichTextEditor
          content={doc}
          placeholder={placeholder}
          variant="notes"
          onChange={emitFromDoc}
          onEditorReady={handleEditorReady}
          className="border-0 bg-transparent shadow-none"
        />
      </div>
      {typeof maxLength === "number" ? (
        <p
          className={cn(
            "text-right text-xs",
            overLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {plainLength}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}
