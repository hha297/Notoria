"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Link2, Loader2, Upload } from "lucide-react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  createListeningLesson,
  transcribeListeningLesson,
} from "@/lib/actions/listening";
import { isListeningErrorCode } from "@/lib/listening/errors";
import {
  extractListeningMediaLocally,
  isLocalListeningExtractorReady,
} from "@/lib/listening/local-extractor";
import {
  isAllowedListeningFile,
  isHostedMediaPageUrl,
  isValidListeningSourceUrl,
  MAX_LISTENING_FILE_SIZE,
} from "@/lib/listening/utils";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import { cn } from "@/lib/utils";

type MediaSource = "file" | "url";
type UploadStep = "form" | "uploading" | "fetching" | "transcribing";

type UploadListeningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UploadListeningDialog({
  open,
  onOpenChange,
}: UploadListeningDialogProps) {
  const t = useTranslations("listening");
  const tMeta = useTranslations("listening.meta");
  const tc = useTranslations("common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<MediaSource>("file");
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cefrLevel, setCefrLevel] = useState("none");
  const [topic, setTopic] = useState("none");
  const [formality, setFormality] = useState("none");
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<UploadStep>("form");
  const [extractorReady, setExtractorReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const busy = isPending || step !== "form";
  const canSubmit = source === "file" ? Boolean(file) : Boolean(mediaUrl.trim());

  useEffect(() => {
    if (!open || source !== "url") return;

    let cancelled = false;
    isLocalListeningExtractorReady()
      .then((ready) => {
        if (!cancelled) setExtractorReady(ready);
      })
      .catch(() => {
        if (!cancelled) setExtractorReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, source]);

  function resetForm() {
    setSource("file");
    setFile(null);
    setMediaUrl("");
    setUrlError(null);
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

  function selectSource(next: MediaSource) {
    if (next === source) return;
    setSource(next);
    setUrlError(null);
    setDragOver(false);
    if (next === "file") {
      setMediaUrl("");
    } else {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
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
    setFile(next);
    setMediaUrl("");
    setUrlError(null);
  }

  function handleMediaUrlChange(value: string) {
    setMediaUrl(value);
    if (!urlError) return;
    setUrlError(
      isValidListeningSourceUrl(value) ? null : t("errors.INVALID_URL"),
    );
  }

  function handleOpenChange(next: boolean) {
    if (busy && !next) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (source === "file") {
      if (!file) return;
    } else if (!isValidListeningSourceUrl(mediaUrl)) {
      setUrlError(t("errors.INVALID_URL"));
      return;
    } else {
      setUrlError(null);
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("title", title);
        formData.set("cefrLevel", cefrLevel);
        formData.set("topic", topic);
        formData.set("formality", formality);

        if (source === "file" && file) {
          formData.set("source", "file");
          formData.set("file", file);
        } else if (isHostedMediaPageUrl(mediaUrl)) {
          setStep("fetching");
          const extracted = await extractListeningMediaLocally(mediaUrl.trim());
          if (!extracted) {
            throw new Error("LOCAL_EXTRACTOR_REQUIRED");
          }
          formData.set("source", "file");
          formData.set("file", extracted.file);
          if (!title.trim() && extracted.title) {
            formData.set("title", extracted.title);
          }
        } else {
          formData.set("source", "url");
          formData.set("mediaUrl", mediaUrl.trim());
        }

        setStep(source === "url" ? "fetching" : "uploading");
        const created = await createListeningLesson(formData);
        if ("error" in created) {
          throw new Error(created.error);
        }

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
      : step === "fetching"
        ? t("steps.fetching")
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
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">{t("chooseSource")}</p>
              <ToggleGroup
                value={[source]}
                onValueChange={(value) => {
                  const next = value[0] as MediaSource | undefined;
                  if (next) selectSource(next);
                }}
                className="flex w-full gap-2"
              >
                <ToggleGroupItem
                  value="file"
                  variant="outline"
                  className="h-9 flex-1 cursor-pointer uppercase tracking-[0.2px]"
                >
                  {t("sourceFile")}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="url"
                  variant="outline"
                  className="h-9 flex-1 cursor-pointer uppercase tracking-[0.2px]"
                >
                  {t("sourceUrl")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {source === "file" ? (
              <>
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
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="listening-media-url">{t("urlLabel")}</Label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="listening-media-url"
                    type="url"
                    value={mediaUrl}
                    onChange={(event) => handleMediaUrlChange(event.target.value)}
                    placeholder={t("urlPlaceholder")}
                    aria-invalid={urlError ? true : undefined}
                    className="h-10 pl-9"
                  />
                </div>
                {urlError ? (
                  <p className="text-sm text-destructive">{urlError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {extractorReady ? t("extractorReady") : t("extractorOffline")}
                  </p>
                )}
              </div>
            )}

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
            disabled={!canSubmit || busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : source === "url" ? (
              <Link2 className="size-4" />
            ) : (
              <Upload className="size-4" />
            )}
            {source === "url" ? t("generateAction") : t("uploadAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
