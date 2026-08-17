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
  DialogFooter,
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
import { cn } from "@/lib/utils";

type UploadStep = "form" | "uploading" | "transcribing";

type UploadListeningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFilenames?: string[];
};

export function UploadListeningDialog({
  open,
  onOpenChange,
  existingFilenames = [],
}: UploadListeningDialogProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
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

        setStep("uploading");
        const created = await createListeningLesson(formData);

        setStep("transcribing");
        await transcribeListeningLesson(created.id);

        toast.success(t("created"));
        resetForm();
        onOpenChange(false);
        router.push(`/listening/${created.id}`);
        router.refresh();
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
      <DialogContent className="sm:max-w-lg" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{t("uploadTitle")}</DialogTitle>
          <DialogDescription>{t("uploadDescription")}</DialogDescription>
        </DialogHeader>

        {stepLabel ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-ink" />
            <p className="font-medium text-ink">{stepLabel}</p>
            <p className="text-sm text-muted-foreground">{t("steps.wait")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
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
              className={cn(
                "flex w-full cursor-pointer flex-col items-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                dragOver
                  ? "border-accent-lime bg-accent-lime/15"
                  : "border-hairline-cloud bg-muted/30 hover:border-accent-lime/50",
              )}
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-hairline-cloud bg-card">
                {file ? (
                  <Headphones className="size-5 text-ink" />
                ) : (
                  <Upload className="size-5 text-ink" />
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

            <div className="space-y-2">
              <Label htmlFor="listening-title">
                {t("titleLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({tc("optional")})
                </span>
              </Label>
              <Input
                id="listening-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("titlePlaceholder")}
                className="h-10"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{tMeta("cefrLabel")}</Label>
                <Select value={cefrLevel} onValueChange={(value) => value && setCefrLevel(value)}>
                  <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 data-[size=default]:h-10!">
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
              <div className="space-y-2">
                <Label>{tMeta("topicLabel")}</Label>
                <Select value={topic} onValueChange={(value) => value && setTopic(value)}>
                  <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 data-[size=default]:h-10!">
                    <SelectValue>
                      {topic === "none" ? tMeta("none") : tMeta(`topics.${topic as (typeof WRITING_TOPICS)[number]}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tMeta("none")}</SelectItem>
                    {WRITING_TOPICS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {tMeta(`topics.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tMeta("formalityLabel")}</Label>
                <Select
                  value={formality}
                  onValueChange={(value) => value && setFormality(value)}
                >
                  <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 data-[size=default]:h-10!">
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {t("uploadAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
