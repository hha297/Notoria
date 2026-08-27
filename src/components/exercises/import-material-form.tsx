"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImageIcon, Link2, Type, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { lockedFeatureClassName } from "@/components/billing/locked-styles";
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
  const { hasProAccess, openUpgrade } = useProAccess();
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
    return isExerciseImportErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function ensurePro() {
    if (!hasProAccess) {
      openUpgrade();
      return false;
    }
    return true;
  }

  const finishReady = useCallback(
    async (importId: string) => {
      setStage("saving");
      complete();
      toast.success(t("ready"));
      resetFormFields();
      retryImportIdRef.current = null;
      router.refresh();
      router.push(`/exercises/import/${importId}`);
      // Allow navigation; clear panel shortly after
      window.setTimeout(() => resetProcessing(), 400);
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
      if (!ensurePro() || isBusy) return;

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
      hasProAccess,
      openUpgrade,
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
    if (!ensurePro() || isBusy) return;
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
    if (!ensurePro() || isBusy) return;
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
    <div className="space-y-5 rounded-2xl border border-hairline-cloud bg-card p-5 sm:p-6">
      <div>
        <h3 className="font-heading text-lg font-medium text-ink">
          {t("formTitle")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("formDescription")}</p>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-hairline-cloud bg-muted/30 p-1">
        {modes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={isBusy}
              onClick={() => setMode(item.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-ink shadow-sm ring-1 ring-hairline-cloud"
                  : "text-muted-foreground hover:text-ink",
              )}
            >
              <Icon className="size-3.5 opacity-80" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-title">{t("titleLabel")}</Label>
        <Input
          id="import-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          disabled={isBusy}
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
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="import-url">{t("urlLabel")}</Label>
            <Input
              id="import-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("urlPlaceholder")}
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
            aria-disabled={!hasProAccess || undefined}
            className={cn(!hasProAccess && lockedFeatureClassName)}
          >
            {hasProAccess ? t("importAction") : t("unlockPro")}
          </Button>
        </div>
      ) : mode === "text" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="import-text">{t("textLabel")}</Label>
            <Textarea
              id="import-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={t("textPlaceholder")}
              className="min-h-40 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={() => void handleTextImport()}
            disabled={text.trim().length < 20}
            aria-disabled={!hasProAccess || undefined}
            className={cn(!hasProAccess && lockedFeatureClassName)}
          >
            {hasProAccess ? t("importAction") : t("unlockPro")}
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!ensurePro()) return;
              inputRef.current?.click();
            }
          }}
          onClick={() => {
            if (!ensurePro()) return;
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
            "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
            dragOver
              ? "border-accent-lime bg-accent-lime/10"
              : "border-hairline-cloud bg-muted/20 hover:border-accent-lime/50",
            !hasProAccess && lockedFeatureClassName,
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl border border-hairline-cloud bg-card">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-heading text-lg font-medium text-ink">
              {mode === "image" ? t("dropImageTitle") : t("dropFileTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{t("dropDescription")}</p>
          </div>
          {mode === "image" ? (
            <p className="text-sm text-muted-foreground">{t("pasteHint")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("supportedFiles")}</p>
          )}
          <p className="text-xs text-muted-foreground">{t("pasteAlwaysHint")}</p>
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
