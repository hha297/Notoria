"use client";

import { useEffect, useState, useTransition } from "react";
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
  createReadingPassage,
  extractReadingUpload,
} from "@/lib/actions/reading";
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
  const [extracting, setExtracting] = useState(false);

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
  }, [open, defaultLanguage]);

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isReadingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  async function handleFile(file: File | null) {
    setSelectedFile(file);
    setExtractError(null);
    if (!file) {
      setSourceFilename(null);
      setSourceType("paste");
      return;
    }

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const extracted = await extractReadingUpload(formData);
      setTitle(extracted.title);
      setBody(extracted.body);
      setSourceType(extracted.sourceType);
      setSourceFilename(extracted.sourceFilename);
      setTab("paste");
      if (!extracted.valid && extracted.errorCode) {
        setExtractError(t(`errors.${extracted.errorCode}`));
      } else {
        toast.success(t("extractSuccess"));
      }
    } catch (error) {
      setExtractError(errorMessage(error));
    } finally {
      setExtracting(false);
    }
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const created = await createReadingPassage({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            >
              {t("tabPaste")}
            </Button>
            <Button
              type="button"
              variant={tab === "upload" ? "default" : "outline"}
              onClick={() => setTab("upload")}
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
              error={extractError}
              dropTitle={t("dropTitle")}
              dropActiveTitle={t("dropActive")}
              dropDescription={t("dropDescription")}
              supportedFormats={t("supportedFiles")}
              extractingLabel={t("extracting")}
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
            onClick={() => onOpenChange(false)}
            disabled={isPending || extracting}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isPending || extracting || tab === "upload" || body.trim().length < 40
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
