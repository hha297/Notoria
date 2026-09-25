"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Link2, Type, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AiProcessingProgress } from "@/components/exercises/ai-processing-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAiProcessing } from "@/hooks/use-ai-processing";
import {
  createExerciseImportFromUploadedAsset,
  createExerciseImportFromUrl,
  extractExerciseImport,
  generateExerciseImportExercises,
  getImportUploadSignature,
  processExerciseImport,
} from "@/lib/actions/exercise-import";
import {
  ImportUploadCancelledError,
  uploadImportFileWithProgress,
} from "@/lib/exercise-import/client-upload";
import { isExerciseImportErrorCode } from "@/lib/exercise-import/errors";
import { formatByteSize } from "@/lib/exercise-import/format-bytes";
import {
  isAllowedImportFile,
  isImageMime,
  isValidHttpUrl,
  MAX_IMPORT_FILE_SIZE,
  resolveImportMime,
} from "@/lib/exercise-import/utils";
import importStyles from "@/components/style/exercises/import.module.css";
import theoryStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type SourceMode = "file" | "image" | "url" | "text";

const PASTE_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

function isPasteableImage(file: File) {
  const mime = resolveImportMime(file).toLowerCase();
  return PASTE_IMAGE_TYPES.has(mime) || isImageMime(mime);
}

export function ImportMaterialForm() {
  const t = useTranslations("exercises.import");
  const tBilling = useTranslations("billing");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryImportIdRef = useRef<string | null>(null);
  const {
    state: processing,
    setStage,
    setUploadProgress,
    reset: resetProcessing,
    fail,
    complete,
    isActive,
    isBusy,
  } = useAiProcessing();

  const [mode, setMode] = useState<SourceMode>("image");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function resetFormFields() {
    setUrl("");
    setText("");
    setTitle("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    if (code === "AI_QUOTA_EXCEEDED") return tBilling("quotaExceeded");
    return isExerciseImportErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  const finishReady = useCallback(
    async (importId: string) => {
      setStage("saving");
      complete();
      router.push(`/exercises/import/${importId}`);
      toast.success(t("ready"));
      resetFormFields();
      retryImportIdRef.current = null;
      resetProcessing();
    },
    [complete, resetProcessing, router, setStage, t],
  );

  const runPostUploadPipeline = useCallback(
    async (importId: string) => {
      retryImportIdRef.current = importId;
      setStage("extracting", { title: processing.title });
      await extractExerciseImport(importId);
      setStage("analyzing");
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      setStage("generating");
      await generateExerciseImportExercises(importId);
      await finishReady(importId);
    },
    [finishReady, processing.title, setStage],
  );

  const processFile = useCallback(
    async (file: File, options?: { requireImage?: boolean }) => {
      if (isBusy) return;

      if (options?.requireImage && !isPasteableImage(file)) {
        toast.error(t("errors.INVALID_FILE_TYPE"));
        return;
      }
      if (!options?.requireImage && !isAllowedImportFile(file)) {
        toast.error(t("errors.INVALID_FILE_TYPE"));
        return;
      }
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        toast.error(t("errors.FILE_TOO_LARGE"));
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const mimeType = resolveImportMime(file);
      const fallbackTitle =
        file.name.replace(/\.[^.]+$/, "") || t("pastedImageTitle");
      const resolvedTitle = title.trim() || fallbackTitle;
      const displayName = file.name || fallbackTitle;

      setUploadProgress({
        percent: 0,
        title: displayName,
        detail: t("uploadBytes", {
          loaded: formatByteSize(0),
          total: formatByteSize(file.size),
        }),
      });

      try {
        const sign = await getImportUploadSignature({
          mimeType,
          filename: file.name,
        });

        const uploaded = await uploadImportFileWithProgress(file, sign, {
          signal: controller.signal,
          onProgress: (progress) => {
            setUploadProgress({
              percent: progress.percent,
              title: displayName,
              detail: t("uploadBytes", {
                loaded: formatByteSize(progress.loaded),
                total: formatByteSize(progress.total || file.size),
              }),
            });
          },
        });

        // Upload network done — overall still mid-pipeline (not 100%).
        setStage("extracting", {
          title: displayName,
          detail: undefined,
          uploadPercent: 100,
        });

        const created = await createExerciseImportFromUploadedAsset({
          fileUrl: uploaded.secureUrl,
          filePublicId: uploaded.publicId,
          mimeType,
          originalFilename: file.name || `${fallbackTitle}.bin`,
          title: resolvedTitle,
          byteSize: file.size,
        });

        await runPostUploadPipeline(created.id);
      } catch (error) {
        if (
          error instanceof ImportUploadCancelledError ||
          (error instanceof Error && error.message === "UPLOAD_CANCELLED")
        ) {
          toast.message(t("uploadCancelled"));
          resetProcessing();
          return;
        }
        fail(errorMessage(error));
        router.refresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable helpers via t/router
    [
      fail,
      isBusy,
      resetProcessing,
      router,
      runPostUploadPipeline,
      setStage,
      setUploadProgress,
      t,
      title,
    ],
  );

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (isBusy) return;
      const items = event.clipboardData?.items;
      if (!items?.length) return;

      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        event.preventDefault();
        const ext = item.type.split("/")[1] || "png";
        const file =
          blob instanceof File && blob.name
            ? blob
            : new File([blob], `pasted-image.${ext}`, {
              type: item.type || "image/png",
            });
        setMode("image");
        void processFile(file, { requireImage: true });
        return;
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isBusy, processFile]);

  function handleCancelUpload() {
    abortRef.current?.abort();
  }

  async function handleUrlImport() {
    if (isBusy) return;
    const trimmed = url.trim();
    if (!trimmed || !isValidHttpUrl(trimmed)) {
      toast.error(t("errors.INVALID_URL"));
      return;
    }

    setStage("extracting", { title: trimmed });
    try {
      const formData = new FormData();
      formData.set("url", trimmed);
      if (title.trim()) formData.set("title", title.trim());
      const created = await createExerciseImportFromUrl(formData);
      await runPostUploadPipeline(created.id);
    } catch (error) {
      fail(errorMessage(error));
      router.refresh();
    }
  }

  async function handleTextImport() {
    if (isBusy) return;
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      toast.error(t("errors.EMPTY_CONTENT"));
      return;
    }

    const file = new File(
      [trimmed],
      `${(title.trim() || "imported-text").slice(0, 80)}.txt`,
      { type: "text/plain" },
    );
    await processFile(file);
  }

  async function handleRetry() {
    const id = retryImportIdRef.current;
    if (!id || isActive) return;
    setStage("extracting", { title: processing.title });
    try {
      await processExerciseImport(id);
      await finishReady(id);
    } catch (error) {
      fail(errorMessage(error));
      router.refresh();
    }
  }

  const modes: { id: SourceMode; label: string; icon: typeof FileText }[] = [
    { id: "image", label: t("modes.image"), icon: ImageIcon },
    { id: "file", label: t("modes.file"), icon: FileText },
    { id: "url", label: t("modes.url"), icon: Link2 },
    { id: "text", label: t("modes.text"), icon: Type },
  ];

  const accept =
    mode === "image"
      ? "image/jpeg,image/png,image/webp,image/gif"
      : ".pdf,.docx,.doc,.txt,.md,image/jpeg,image/png,image/webp,image/gif,text/plain,text/markdown,application/pdf";

  const showProcessing =
    isBusy || processing.stage === "error" || processing.stage === "completed";

  return (
    <div className="space-y-8" data-import-mode={mode}>
      <div className="space-y-4">
        <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("chooseSource")}
        </p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-2 lg:grid-cols-4">
          {modes.map((item, index) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isBusy}
                data-import-mode={item.id}
                aria-pressed={active}
                onClick={() => setMode(item.id)}
                className={cn(
                  mx(
                    importStyles,
                    "import-mode flex cursor-pointer flex-col gap-3 rounded-md px-3 py-4 text-left sm:px-4 sm:py-5",
                  ),
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--import-mode-fg)/40",
                  active ? "text-ink" : "text-muted-foreground hover:text-ink",
                )}
              >
                <span
                  className="font-mono text-[1.35rem] leading-none tabular-nums text-(--import-mode-fg) sm:text-[1.55rem]"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4 shrink-0 text-(--import-mode-fg)" />
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("formDescription")}
        </p>
      </div>

      <div className="space-y-2 px-1">
        <Label htmlFor="import-title" className="text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {t("titleLabel")}
        </Label>
        <Input
          id="import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          disabled={isBusy}
          className="h-11 rounded-none border-0 border-b border-hairline-cloud bg-transparent px-0 shadow-none focus-visible:border-(--import-mode-fg) focus-visible:ring-0"
        />
      </div>

      {showProcessing ? (
        <AiProcessingProgress
          state={processing}
          pipeline="import"
          onCancel={
            processing.stage === "uploading" ? handleCancelUpload : undefined
          }
          onRetry={
            processing.stage === "error" && retryImportIdRef.current
              ? () => void handleRetry()
              : undefined
          }
          onDismissError={
            processing.stage === "error"
              ? () => resetProcessing()
              : undefined
          }
        />
      ) : mode === "url" ? (
        <div className={mx(importStyles, "import-stage import-dropzone space-y-5 rounded-md px-5 py-8 sm:px-7 sm:py-10")}>
          <StageDecor />
          <div className="relative space-y-2">
            <Label htmlFor="import-url" className="text-[0.68rem] font-semibold tracking-[0.16em] text-(--import-mode-fg) uppercase">
              {t("urlLabel")}
            </Label>
            <Input
              id="import-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("urlPlaceholder")}
              className="h-12 rounded-none border-0 border-b border-hairline-cloud bg-transparent px-0 font-heading text-lg shadow-none focus-visible:border-(--import-mode-fg) focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleUrlImport();
                }
              }}
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleUrlImport()}
            disabled={!url.trim()}
            className="relative border-transparent bg-(--import-mode-fg) text-background hover:opacity-90"
          >
            {t("importAction")}
          </Button>
        </div>
      ) : mode === "text" ? (
        <div className={mx(importStyles, "import-stage import-dropzone space-y-5 rounded-md px-5 py-8 sm:px-7 sm:py-10")}>
          <StageDecor />
          <div className="relative space-y-2">
            <Label htmlFor="import-text" className="text-[0.68rem] font-semibold tracking-[0.16em] text-(--import-mode-fg) uppercase">
              {t("textLabel")}
            </Label>
            <Textarea
              id="import-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={t("textPlaceholder")}
              className="min-h-44 resize-y rounded-md border border-(--import-mode-fg)/28 bg-transparent px-3.5 py-3 font-heading text-lg leading-relaxed shadow-none focus-visible:border-(--import-mode-fg)/50 focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleTextImport()}
            disabled={text.trim().length < 20}
            className="relative border-transparent bg-(--import-mode-fg) text-background hover:opacity-90"
          >
            {t("importAction")}
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onClick={() => {
            inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            void processFile(file, { requireImage: mode === "image" });
          }}
          className={cn(
            mx(importStyles, "import-stage import-dropzone flex min-h-60 cursor-pointer flex-col items-center justify-center gap-5 rounded-md px-6 py-12 text-center sm:min-h-72 sm:py-14"),
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--import-mode-fg)/40",
            dragOver && mx(importStyles, "import-dropzone-active"),
          )}
        >
          <StageDecor />
          <div
            className={cn(
              "relative flex size-14 items-center justify-center rotate-45 border border-(--import-mode-fg)/35 text-(--import-mode-fg)",
              dragOver && "border-(--import-mode-fg) bg-(--import-mode-bg)",
            )}
          >
            <Upload className="size-5 -rotate-45" />
          </div>
          <div className="relative space-y-2">
            <p className="font-heading text-[1.65rem] font-bold tracking-tight text-ink sm:text-[1.95rem]">
              {dragOver
                ? t("dropActive")
                : mode === "image"
                  ? t("dropImageTitle")
                  : t("dropFileTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{t("dropDescription")}</p>
          </div>
          <p className="relative max-w-md text-xs leading-5 text-muted-foreground">
            {mode === "image" ? t("pasteHint") : t("supportedFiles")}
            <span aria-hidden> · </span>
            {t("pasteAlwaysHint")}
          </p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void processFile(file, { requireImage: mode === "image" });
            }}
          />
        </div>
      )}
    </div>
  );
}

function StageDecor() {
  return (
    <div aria-hidden className={mx(theoryStyles, "theory-decor")}>
      <span className={mx(theoryStyles, "theory-blob top-[-24%] left-[8%] size-36 bg-(--import-mode-fg)")} />
      <span className={mx(theoryStyles, "theory-blob right-[4%] bottom-[-30%] size-32 bg-(--exercise-accent)")} />
      <span className={mx(theoryStyles, "theory-diamond top-5 right-7 text-(--import-mode-fg)")} />
    </div>
  );
}
