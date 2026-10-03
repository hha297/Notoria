"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUploadDropzone } from "@/components/shared/file-upload-dropzone";
import { LanguageSelect } from "@/components/shared/language-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import styles from "@/components/style/workspace/sheet.module.css";
import {
  beginReadingDocumentUpload,
  createReadingPassage,
  updateReadingPassage,
} from "@/lib/actions/reading";
import {
  completeReadingDocumentRequest,
  failReadingDocumentRequest,
  ReadingUploadCancelledError,
  uploadReadingFileToBlob,
  assertReadableReadingFile,
} from "@/lib/reading/client-upload";
import { isReadingErrorCode } from "@/lib/reading/errors";
import { countWords } from "@/lib/reading/utils";
import type { ReadingPassageListItem } from "@/lib/reading/types";
import { queryKeys } from "@/lib/query/keys";
import { mx } from "@/lib/css-module";

type ImportReadingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  defaultLanguage: string;
  folderId?: string | null;
};

type UploadPhase =
  | "idle"
  | "uploading"
  | "extracting"
  | "ready"
  | "failed";

export function ImportReadingDialog({
  open,
  onOpenChange,
  workspaceId,
  defaultLanguage,
  folderId = null,
}: ImportReadingDialogProps) {
  const t = useTranslations("reading");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState(defaultLanguage || "en");
  const [sourceType, setSourceType] = useState<"paste" | "pdf" | "docx">(
    "paste",
  );
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  const extracting =
    uploadPhase === "uploading" || uploadPhase === "extracting";

  useEffect(() => {
    if (!open) return;
    setTab("paste");
    setTitle("");
    setBody("");
    setLanguage(defaultLanguage || "en");
    setSourceType("paste");
    setSourceFilename(null);
    setSelectedFile(null);
    setExtractError(null);
    setUploadPhase("idle");
    setUploadPercent(0);
    setDocumentId(null);
    busyRef.current = false;
  }, [open, defaultLanguage]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isReadingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  async function cleanupDocument(id: string | null) {
    if (!id) return;
    await failReadingDocumentRequest(id);
  }

  async function handleFile(file: File | null) {
    if (busyRef.current) return;

    abortRef.current?.abort();
    abortRef.current = null;

    if (documentId && uploadPhase !== "ready") {
      void cleanupDocument(documentId);
    }

    setSelectedFile(file);
    setExtractError(null);
    setUploadPercent(0);
    setDocumentId(null);

    if (!file) {
      setSourceFilename(null);
      setSourceType("paste");
      setUploadPhase("idle");
      return;
    }

    const validation = assertReadableReadingFile(file);
    if (!validation.ok) {
      setUploadPhase("failed");
      setExtractError(t(`errors.${validation.code}`));
      return;
    }

    busyRef.current = true;
    setUploadPhase("uploading");
    const controller = new AbortController();
    abortRef.current = controller;

    let pendingDocumentId: string | null = null;

    try {
      const begun = await beginReadingDocumentUpload({
        filename: file.name,
        mimeType: file.type || validation.mimeType,
        sizeBytes: file.size,
        language,
        folderId,
      });
      pendingDocumentId = begun.documentId;
      setDocumentId(begun.documentId);

      const uploaded = await uploadReadingFileToBlob({
        file,
        documentId: begun.documentId,
        pathname: begun.pathname,
        signal: controller.signal,
        onProgress: (progress) => {
          setUploadPercent(progress.percent);
        },
      });

      setUploadPhase("extracting");
      setUploadPercent(100);

      const completed = await completeReadingDocumentRequest({
        documentId: begun.documentId,
        storagePath: uploaded.pathname,
        url: uploaded.url,
        sizeBytes: file.size,
        mimeType: begun.mimeType,
      });

      setTitle(completed.title);
      setBody(completed.body);
      setSourceType(completed.sourceType);
      setSourceFilename(completed.sourceFilename);
      setDocumentId(completed.documentId);
      setTab("paste");
      setUploadPhase("ready");

      if (completed.errorCode && isReadingErrorCode(completed.errorCode)) {
        setExtractError(t(`errors.${completed.errorCode}`));
      } else if (completed.truncated) {
        setExtractError(t("errors.EXTRACT_TRUNCATED"));
      } else if (!completed.valid && completed.errorCode) {
        setExtractError(t(`errors.${completed.errorCode}`));
      } else {
        toast.success(t("extractSuccess"));
      }
    } catch (error) {
      if (
        error instanceof ReadingUploadCancelledError ||
        (error instanceof Error && error.message === "UPLOAD_CANCELLED")
      ) {
        await cleanupDocument(pendingDocumentId);
        setUploadPhase("idle");
        setSelectedFile(null);
        setDocumentId(null);
        return;
      }

      await cleanupDocument(pendingDocumentId);
      setDocumentId(null);
      setUploadPhase("failed");
      setExtractError(errorMessage(error));
    } finally {
      busyRef.current = false;
      abortRef.current = null;
    }
  }

  function handleCancelUpload() {
    abortRef.current?.abort();
    if (documentId && uploadPhase !== "ready") {
      void cleanupDocument(documentId);
    }
    setUploadPhase("idle");
    setSelectedFile(null);
    setDocumentId(null);
    setUploadPercent(0);
    setExtractError(null);
  }

  function handleSave() {
    if (busyRef.current || extracting) return;

    startTransition(async () => {
      try {
        const created = documentId
          ? await updateReadingPassage(documentId, {
              title,
              body,
              language,
            })
          : await createReadingPassage({
              title,
              body,
              language,
              sourceType,
              sourceFilename,
              folderId,
            });

        queryClient.setQueryData(
          queryKeys.reading.list(workspaceId),
          (current: ReadingPassageListItem[] | undefined) => [
            created,
            ...(current ?? []).filter((item) => item.id !== created.id),
          ],
        );
        await queryClient.invalidateQueries({
          queryKey: queryKeys.reading.all(workspaceId),
        });
        toast.success(t("created"));
        onOpenChange(false);
        router.push(`/reading/${created.id}`);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const words = countWords(body);
  const progressLabel =
    uploadPhase === "extracting"
      ? t("extracting")
      : uploadPhase === "uploading"
        ? t("uploading", { percent: uploadPercent })
        : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && extracting) {
          handleCancelUpload();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={mx(
          styles,
          "workspace-sheet flex max-h-[min(92vh,52rem)] flex-col overflow-hidden sm:max-w-xl",
        )}
        data-sheet-route="read"
        data-tutorial="reading-import-dialog"
        showCloseButton={!isPending && !extracting}
      >
        <DialogHeader
          className={mx(
            styles,
            "workspace-sheet-header gap-2 space-y-0 pr-8 text-left",
          )}
        >
          <p className={mx(styles, "workspace-sheet-kicker")}>{t("title")}</p>
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("importTitle")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-lede")}>
            {t("importDescription")}
          </DialogDescription>
        </DialogHeader>

        <div
          className={mx(
            styles,
            "workspace-sheet-body min-h-0 flex-1 space-y-4 overflow-y-auto",
          )}
        >
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label={t("importTabsAria")}
          >
            <Button
              type="button"
              variant={tab === "paste" ? "default" : "outline"}
              onClick={() => setTab("paste")}
              disabled={extracting}
            >
              {t("tabPaste")}
            </Button>
            <Button
              type="button"
              variant={tab === "upload" ? "default" : "outline"}
              onClick={() => setTab("upload")}
              disabled={extracting}
            >
              {t("tabUpload")}
            </Button>
          </div>

          {tab === "upload" ? (
            <FileUploadDropzone
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={extracting || isPending}
              selectedFile={selectedFile}
              extracting={extracting}
              progressPercent={
                uploadPhase === "uploading" || uploadPhase === "extracting"
                  ? uploadPercent
                  : null
              }
              progressLabel={progressLabel}
              error={extractError}
              dropTitle={t("dropTitle")}
              dropActiveTitle={t("dropActive")}
              dropDescription={t("dropDescription")}
              supportedFormats={t("supportedFiles")}
              extractingLabel={progressLabel || t("extracting")}
              replaceLabel={t("replaceFile")}
              removeLabel={tc("remove")}
              onFile={(file) => {
                void handleFile(file);
              }}
            />
          ) : (
            <div className="space-y-3">
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label htmlFor="reading-title">{t("titleLabel")}</Label>
                <Input
                  id="reading-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  disabled={isPending}
                />
              </div>
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label htmlFor="reading-language">{t("languageLabel")}</Label>
                <LanguageSelect
                  id="reading-language"
                  value={language}
                  onValueChange={setLanguage}
                  disabled={isPending}
                  className={mx(styles, "workspace-sheet-input")}
                  contentClassName={mx(styles, "workspace-sheet-menu")}
                  aria-label={t("languageLabel")}
                />
              </div>
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label htmlFor="reading-body">{t("bodyLabel")}</Label>
                <Textarea
                  id="reading-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("bodyPlaceholder")}
                  disabled={isPending}
                  rows={10}
                  className="min-h-40 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {t("wordCount", { count: words })}
                </p>
                {extractError ? (
                  <p className="text-sm text-destructive">{extractError}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className={mx(styles, "workspace-sheet-footer")}>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (extracting) {
                handleCancelUpload();
              }
              onOpenChange(false);
            }}
            disabled={isPending}
          >
            {extracting ? t("cancelUpload") : tc("cancel")}
          </Button>
          {uploadPhase === "failed" && selectedFile ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleFile(selectedFile)}
              disabled={isPending || extracting}
            >
              {t("retryUpload")}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isPending ||
              extracting ||
              tab === "upload" ||
              body.trim().length < 40
            }
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? t("saving") : t("savePassage")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
