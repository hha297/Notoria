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
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import {
  collectImageFiles,
  editorDocHasTransientImages,
  fileFromTransientSrc,
  isTransientMediaSrc,
} from "@/lib/editor/images";
import {
  removeEditorImagesBySrc,
  replaceEditorImageSrc,
} from "@/lib/editor/insert-images";
import { uploadEditorImageFile } from "@/lib/editor/upload-image";
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
  /** Same extensions/toolbar as writing; notes is only a more compact shell. */
  variant?: "full" | "notes";
  showFooter?: boolean;
  onEditorReady?: (editor: Editor | null) => void;
  onImageUploadPendingChange?: (pending: boolean) => void;
};

function buildExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: false,
      underline: false,
    }),
    Underline,
    Highlight,
    Link.configure({
      openOnClick: false,
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
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
  ];
}

export function RichTextEditor({
  content,
  placeholder = "Start writing...",
  onChange,
  onAutosave,
  autosaveDelayMs = 1500,
  className,
  editable = true,
  variant = "full",
  showFooter,
  onEditorReady,
  onImageUploadPendingChange,
}: RichTextEditorProps) {
  const tEditor = useTranslations("editor");
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef("");
  const pendingUploads = useRef(0);
  const insertImagesRef = useRef<(files: File[]) => void>(() => {});
  const persistTransientRef = useRef<(currentEditor: Editor) => void>(() => {});
  const emitLatestRef = useRef<(currentEditor: Editor) => void>(() => {});
  const isNotes = variant === "notes";
  const footerVisible = showFooter ?? !isNotes;

  function imageErrorMessage(code: string) {
    switch (code) {
      case "FILE_TOO_LARGE":
        return tEditor("imageTooLarge");
      case "INVALID_FILE_TYPE":
      case "INVALID_FILE":
        return tEditor("imageInvalidType");
      case "CLOUDINARY_NOT_CONFIGURED":
        return tEditor("imageUnavailable");
      default:
        return tEditor("imagePasteFailed");
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: buildExtensions(placeholder),
    content: content ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (pendingUploads.current > 0) return;

      const json = currentEditor.getJSON();
      if (editorDocHasTransientImages(json)) {
        persistTransientRef.current(currentEditor);
        return;
      }

      onChange?.(json);

      if (!onAutosave) return;

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      autosaveTimer.current = setTimeout(() => {
        const serialized = JSON.stringify(json);
        if (serialized === lastSavedContent.current) return;
        if (pendingUploads.current > 0) return;

        void Promise.resolve(onAutosave(json)).then(() => {
          lastSavedContent.current = serialized;
        });
      }, autosaveDelayMs);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral dark:prose-invert max-w-none px-4 py-3 focus:outline-none",
          "[&_img]:h-auto [&_img]:max-h-80 [&_img]:max-w-full [&_img]:rounded-lg",
          isNotes
            ? editable
              ? "min-h-[140px]"
              : "min-h-0"
            : editable
              ? "min-h-[320px]"
              : "min-h-0",
        ),
      },
      handlePaste(_view, event) {
        const files = collectImageFiles(event.clipboardData);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImagesRef.current(files);
        return true;
      },
      handleDrop(_view, event) {
        const files = collectImageFiles(event.dataTransfer);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImagesRef.current(files);
        return true;
      },
    },
  });

  emitLatestRef.current = (currentEditor) => {
    const json = currentEditor.getJSON();
    onChange?.(json);

    if (!onAutosave || pendingUploads.current > 0) return;
    const serialized = JSON.stringify(json);
    if (serialized === lastSavedContent.current) return;
    void Promise.resolve(onAutosave(json)).then(() => {
      lastSavedContent.current = serialized;
    });
  };

  async function beginUploadWork(
    currentEditor: Editor,
    work: () => Promise<void>,
  ) {
    pendingUploads.current += 1;
    onImageUploadPendingChange?.(true);
    try {
      await work();
    } finally {
      pendingUploads.current = Math.max(0, pendingUploads.current - 1);
      if (pendingUploads.current === 0) {
        onImageUploadPendingChange?.(false);
        emitLatestRef.current(currentEditor);
      }
    }
  }

  insertImagesRef.current = (files) => {
    const currentEditor = editor;
    if (!currentEditor || files.length === 0) return;

    void beginUploadWork(currentEditor, async () => {
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        currentEditor.chain().focus().setImage({ src: objectUrl }).run();
        const result = await uploadEditorImageFile(file);
        if ("error" in result) {
          removeEditorImagesBySrc(currentEditor, objectUrl);
          toast.error(imageErrorMessage(result.error));
        } else {
          replaceEditorImageSrc(currentEditor, objectUrl, result.url);
        }
        URL.revokeObjectURL(objectUrl);
      }
    });
  };

  persistTransientRef.current = (currentEditor) => {
    void beginUploadWork(currentEditor, async () => {
      const srcs: string[] = [];
      currentEditor.state.doc.descendants((node) => {
        const src = String(node.attrs?.src ?? "");
        if (node.type.name === "image" && isTransientMediaSrc(src)) {
          srcs.push(src);
        }
      });

      for (const src of srcs) {
        try {
          const file = await fileFromTransientSrc(src);
          const result = await uploadEditorImageFile(file);
          if ("error" in result) {
            removeEditorImagesBySrc(currentEditor, src);
            toast.error(imageErrorMessage(result.error));
          } else {
            replaceEditorImageSrc(currentEditor, src, result.url);
          }
        } catch {
          removeEditorImagesBySrc(currentEditor, src);
          toast.error(tEditor("imagePasteFailed"));
        }
      }
    });
  };

  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  useEffect(() => {
    onEditorReadyRef.current?.(editor ?? null);
    return () => {
      onEditorReadyRef.current?.(null);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || content === undefined) return;
    if (pendingUploads.current > 0) return;

    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content ?? { type: "doc", content: [] });

    if (current !== incoming) {
      editor.commands.setContent(content ?? { type: "doc", content: [] });
      lastSavedContent.current = incoming;
    }
  }, [content, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-lg border bg-muted/30",
          isNotes ? "min-h-[180px]" : "min-h-[360px]",
        )}
      />
    );
  }

  const characters = editor.storage.characterCount.characters();
  const words = editor.storage.characterCount.words();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-hairline-cloud bg-card",
        className,
      )}
    >
      {editable && <EditorToolbar editor={editor} />}
      <div className="overflow-x-auto">
        <EditorContent
          editor={editor}
          className={cn(!editable && "[&_.ProseMirror]:min-h-0")}
        />
      </div>
      {editable && footerVisible && (
        <div className="flex flex-col gap-1 border-t border-hairline-cloud bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <span>
            {words} words · {characters} characters
          </span>
          {onAutosave && <span>Autosave enabled</span>}
        </div>
      )}
    </div>
  );
}
