"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Video } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createSpeakingSession } from "@/lib/actions/speaking";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import {
  WRITING_CEFR_LEVELS,
  WRITING_TOPICS,
  type WritingCefr,
} from "@/lib/writing/meta";

type NewSpeakingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewSpeakingDialog({
  open,
  onOpenChange,
}: NewSpeakingDialogProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tc = useTranslations("common");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [cefrLevel, setCefrLevel] = useState("b1");
  const [topic, setTopic] = useState("daily");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setCefrLevel("b1");
    setTopic("daily");
    setNotes("");
  }

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "STREAM_CALL_FAILED";
    return isSpeakingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.STREAM_CALL_FAILED");
  }

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("title", title);
        formData.set("cefrLevel", cefrLevel);
        formData.set("topic", topic);
        formData.set("notes", notes);
        const created = await createSpeakingSession(formData);
        toast.success(t("created"));
        resetForm();
        onOpenChange(false);
        router.push(`/speaking/${created.id}`);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("newTitle")}</DialogTitle>
          <DialogDescription>{t("newDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="speaking-title">
              {t("titleLabel")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Input
              id="speaking-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              className="h-10"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{tMeta("cefrLabel")}</Label>
              <Select
                value={cefrLevel}
                onValueChange={(value) => value && setCefrLevel(value)}
                disabled={isPending}
              >
                <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 data-[size=default]:h-10!">
                  <SelectValue>
                    {tMeta(`cefr.${cefrLevel as WritingCefr}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
              <Select
                value={topic}
                onValueChange={(value) => value && setTopic(value)}
                disabled={isPending}
              >
                <SelectTrigger className="h-10! w-full rounded-md bg-background px-3 data-[size=default]:h-10!">
                  <SelectValue>
                    {tMeta(`topics.${topic as (typeof WRITING_TOPICS)[number]}`)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WRITING_TOPICS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {tMeta(`topics.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaking-notes">
              {t("notesLabel")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Textarea
              id="speaking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Video className="size-4" />
            )}
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
