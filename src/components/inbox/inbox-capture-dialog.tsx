"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { createStudyInboxItem } from "@/lib/actions/study-inbox";

type InboxCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InboxCaptureDialog({
  open,
  onOpenChange,
}: InboxCaptureDialogProps) {
  const t = useTranslations("inbox");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setContent("");
    setNote("");
    setSource("");
  }

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error(t("contentRequired"));
      return;
    }

    startTransition(async () => {
      try {
        await createStudyInboxItem({
          content: trimmed,
          note: note.trim(),
          source: source.trim(),
        });
        toast.success(t("captured"));
        handleOpenChange(false);
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("captureTitle")}</DialogTitle>
          <DialogDescription>{t("captureDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="inbox-content">{t("contentLabel")}</Label>
            <Textarea
              id="inbox-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t("contentPlaceholder")}
              rows={4}
              required
              disabled={isPending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbox-note">{t("noteLabel")}</Label>
            <Textarea
              id="inbox-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              rows={2}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbox-source">{t("sourceLabel")}</Label>
            <Input
              id="inbox-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder={t("sourcePlaceholder")}
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !content.trim()}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t("captureSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
