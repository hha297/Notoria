"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import importStyles from "@/components/style/exercises/import.module.css";
import theoryStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

function formatByteSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileUploadDropzoneProps = {
  accept: string;
  disabled?: boolean;
  selectedFile?: File | null;
  extracting?: boolean;
  error?: string | null;
  dropTitle: string;
  dropActiveTitle: string;
  dropDescription: string;
  supportedFormats: string;
  extractingLabel: string;
  replaceLabel: string;
  removeLabel: string;
  onFile: (file: File | null) => void;
  className?: string;
  accentClassName?: string;
  footerHint?: ReactNode;
};

export function FileUploadDropzone({
  accept,
  disabled,
  selectedFile,
  extracting,
  error,
  dropTitle,
  dropActiveTitle,
  dropDescription,
  supportedFormats,
  extractingLabel,
  replaceLabel,
  removeLabel,
  onFile,
  className,
  footerHint,
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function choose(file: File | null | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    onFile(null);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (disabled) return;
          choose(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          mx(
            importStyles,
            "import-stage import-dropzone flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-md px-5 py-8 text-center sm:min-h-52 sm:py-10",
          ),
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--import-mode-fg)/40",
          dragOver && mx(importStyles, "import-dropzone-active"),
          disabled && "pointer-events-none opacity-60",
        )}
        style={
          {
            ["--import-mode-fg" as string]: "var(--module-read-fg)",
            ["--import-mode-bg" as string]: "var(--module-read-bg)",
            ["--exercise-accent" as string]: "var(--module-read-fg)",
          } as CSSProperties
        }
      >
        <div aria-hidden className={mx(theoryStyles, "theory-decor")}>
          <span
            className={mx(
              theoryStyles,
              "theory-blob top-[-24%] left-[8%] size-36 bg-(--import-mode-fg)",
            )}
          />
          <span
            className={mx(
              theoryStyles,
              "theory-blob right-[4%] bottom-[-30%] size-32 bg-(--exercise-accent)",
            )}
          />
        </div>
        <div
          className={cn(
            "relative flex size-14 items-center justify-center rotate-45 border border-(--import-mode-fg)/35 text-(--import-mode-fg)",
            dragOver && "border-(--import-mode-fg) bg-(--import-mode-bg)",
          )}
        >
          {selectedFile ? (
            <FileText className="size-5 -rotate-45" />
          ) : (
            <Upload className="size-5 -rotate-45" />
          )}
        </div>
        <div className="relative space-y-2">
          <p className="font-heading text-[1.35rem] font-bold tracking-tight text-ink sm:text-[1.55rem]">
            {extracting
              ? extractingLabel
              : dragOver
                ? dropActiveTitle
                : selectedFile
                  ? selectedFile.name
                  : dropTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedFile && !extracting
              ? `${formatByteSize(selectedFile.size)} · ${replaceLabel}`
              : dropDescription}
          </p>
        </div>
        <p className="relative max-w-md text-xs leading-5 text-muted-foreground">
          {supportedFormats}
          {footerHint}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            choose(file);
          }}
        />
      </div>

      {selectedFile ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline-cloud bg-surface-elevated/70 px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatByteSize(selectedFile.size)}
              {extracting ? ` · ${extractingLabel}` : null}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || extracting}
            onClick={(event) => {
              event.stopPropagation();
              clear();
            }}
          >
            <X className="size-3.5" />
            {removeLabel}
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
