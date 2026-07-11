"use client";

import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef } from "react";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

type RichTextEditorProps = {
  content?: JSONContent | null;
  placeholder?: string;
  onChange?: (content: JSONContent) => void;
  onAutosave?: (content: JSONContent) => Promise<void> | void;
  autosaveDelayMs?: number;
  className?: string;
  editable?: boolean;
};

export function RichTextEditor({
  content,
  placeholder = "Start writing...",
  onChange,
  onAutosave,
  autosaveDelayMs = 1500,
  className,
  editable = true,
}: RichTextEditorProps) {
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>("");

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content: content ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    onUpdate: ({ editor: currentEditor }) => {
      const json = currentEditor.getJSON();
      onChange?.(json);

      if (!onAutosave) return;

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      autosaveTimer.current = setTimeout(() => {
        const serialized = JSON.stringify(json);
        if (serialized === lastSavedContent.current) return;

        void Promise.resolve(onAutosave(json)).then(() => {
          lastSavedContent.current = serialized;
        });
      }, autosaveDelayMs);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-[320px] px-4 py-3 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor || content === undefined) return;

    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content ?? { type: "doc", content: [] });

    if (current !== incoming) {
      editor.commands.setContent(content ?? { type: "doc", content: [] });
      lastSavedContent.current = incoming;
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div className="min-h-[360px] animate-pulse rounded-lg border bg-muted/30" />
    );
  }

  const characters = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div className={cn("overflow-hidden rounded-xl border border-hairline-cloud bg-card", className)}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between border-t border-hairline-cloud bg-muted/30 px-4 py-2 font-mono text-xs text-muted-foreground">
        <span>
          {words} words · {characters} characters
        </span>
        {onAutosave && <span>Autosave enabled</span>}
      </div>
    </div>
  );
}
