"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createListeningLesson,
  transcribeListeningLesson,
} from "@/lib/actions/listening";
import { isListeningErrorCode } from "@/lib/listening/errors";
import {
  isAllowedListeningFile,
  MAX_LISTENING_FILE_SIZE,
  normalizeListeningFilename,
} from "@/lib/listening/utils";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import styles from "@/components/style/workspace/sheet.module.css";
import { mx } from "@/lib/css-module";

type UploadStep = "form" | "uploading" | "transcribing";

type UploadListeningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
  existingFilenames?: string[];
};

export function UploadListeningDialog({
  open,
  onOpenChange,
  folderId = null,
  existingFilenames = [],
}: UploadListeningDialogProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [cefrLevel, setCefrLevel] = useState("none");
  const [topic, setTopic] = useState("none");
  const [formality, setFormality] = useState("none");
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<UploadStep>("form");
  const [isPending, startTransition] = useTransition();

  const busy = isPending || step !== "form";

  function resetForm() {
    setFile(null);
    setTitle("");
    setCefrLevel("none");
    setTopic("none");
    setFormality("none");
    setStep("form");
    if (inputRef.current) inputRef.current.value = "";
  }

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "PROCESSING_FAILED";
    return isListeningErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.PROCESSING_FAILED");
  }

  function isDuplicateFilename(filename: string) {
    const normalized = normalizeListeningFilename(filename);
    if (!normalized) return false;
    return existingFilenames.some(
      (existing) => normalizeListeningFilename(existing) === normalized,
    );
  }

  function chooseFile(next: File | undefined) {
    if (!next) return;
    if (!isAllowedListeningFile(next)) {
      toast.error(t("errors.INVALID_FILE_TYPE"));
      return;
    }
    if (next.size > MAX_LISTENING_FILE_SIZE) {
      toast.error(t("errors.FILE_TOO_LARGE"));
      return;
    }
    if (isDuplicateFilename(next.name)) {
      toast.error(t("errors.DUPLICATE_FILENAME"));
      return;
    }
    setFile(next);
  }

  function handleOpenChange(next: boolean) {
    if (busy && !next) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!file) return;
    if (isDuplicateFilename(file.name)) {
      toast.error(t("errors.DUPLICATE_FILENAME"));
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("title", title);
        formData.set("cefrLevel", cefrLevel);
        formData.set("topic", topic);
        formData.set("formality", formality);
        if (folderId) {
          formData.set("folderId", folderId);
        }

        setStep("uploading");
        const created = await createListeningLesson(formData);

        setStep("transcribing");
        await transcribeListeningLesson(created.id);

        router.push("/listening");
        toast.success(t("created"));
        onOpenChange(false);
        resetForm();
      } catch (error) {
        setStep("form");
        toast.error(errorMessage(error));
        router.refresh();
      }
    });
  }

  const stepLabel =
    step === "uploading"
      ? t("steps.uploading")
      : step === "transcribing"
        ? t("steps.transcribing")
        : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={mx(styles, "workspace-sheet sm:max-w-lg")}
        data-sheet-route="listen"
        showCloseButton={!busy}
      >
        <DialogHeader className={mx(styles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
          <p className={mx(styles, "workspace-sheet-kicker")}>{t("title")}</p>
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("uploadTitle")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-lede")}>
            {t("uploadDescription")}
          </DialogDescription>
        </DialogHeader>

        {stepLabel ? (
          <div className={mx(styles, "workspace-sheet-body items-center py-10 text-center")}>
            <Loader2 className="size-8 animate-spin text-module-listen-fg" />
            <p className="font-medium text-ink">{stepLabel}</p>
            <p className="text-sm text-muted-foreground">{t("steps.wait")}</p>
          </div>
        ) : (
          <div className={mx(styles, "workspace-sheet-body")}>
            <button
              type="button"
              data-tutorial="listening-upload-dropzone"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                chooseFile(event.dataTransfer.files[0]);
              }}
              className={mx(
                styles,
                "workspace-sheet-dropzone",
                dragOver && "is-active",
              )}
            >
              <div className="mb-3 flex size-12 items-center justify-center text-module-listen-fg">
                {file ? (
                  <Headphones className="size-5" />
                ) : (
                  <Upload className="size-5" />
                )}
              </div>
              <p className="font-medium text-ink">
                {file ? file.name : t("dropTitle")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {file ? t("replaceFile") : t("dropDescription")}
              </p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".mp3,.mp4,audio/mpeg,video/mp4"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />

            <div className={mx(styles, "workspace-sheet-field")}>
              <Label htmlFor="listening-title" className={mx(styles, "workspace-sheet-label")}>
                {t("titleLabel")}{" "}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  ({tc("optional")})
                </span>
              </Label>
              <Input
                id="listening-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("titlePlaceholder")}
                className={mx(styles, "workspace-sheet-input")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label className={mx(styles, "workspace-sheet-label")}>{tMeta("cefrLabel")}</Label>
                <Select
                  value={cefrLevel}
                  onValueChange={(value) => value && setCefrLevel(value)}
                >
                  <SelectTrigger className={mx(styles, "workspace-sheet-input w-full")}>
                    <SelectValue>
                      {cefrLevel === "none"
                        ? tMeta("none")
                        : tMeta(`cefr.${cefrLevel as WritingCefr}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tMeta("none")}</SelectItem>
                    {WRITING_CEFR_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {tMeta(`cefr.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label className={mx(styles, "workspace-sheet-label")}>{tMeta("topicLabel")}</Label>
                <Select
                  value={topic}
                  onValueChange={(value) => value && setTopic(value)}
                >
                  <SelectTrigger className={mx(styles, "workspace-sheet-input w-full")}>
                    <SelectValue>
                      {topic === "none"
                        ? tMeta("none")
                        : resolveTopicLabel(topic, (key) => tTags(key))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tMeta("none")}</SelectItem>
                    {WRITING_TOPICS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {resolveTopicLabel(item, (key) => tTags(key))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={mx(styles, "workspace-sheet-field")}>
                <Label className={mx(styles, "workspace-sheet-label")}>
                  {tMeta("formalityLabel")}
                </Label>
                <Select
                  value={formality}
                  onValueChange={(value) => value && setFormality(value)}
                >
                  <SelectTrigger className={mx(styles, "workspace-sheet-input w-full")}>
                    <SelectValue>
                      {formality === "none"
                        ? tMeta("none")
                        : tMeta(`formality.${formality as WritingFormality}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tMeta("none")}</SelectItem>
                    {WRITING_FORMALITY.map((item) => (
                      <SelectItem key={item} value={item}>
                        {tMeta(`formality.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className={mx(styles, "workspace-sheet-footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(styles, "workspace-sheet-cancel")}
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className={mx(styles, "workspace-sheet-cta")}
            onClick={handleSubmit}
            disabled={!file || busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {t("uploadAction")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
